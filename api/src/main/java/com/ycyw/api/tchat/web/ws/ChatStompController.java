package com.ycyw.api.tchat.web.ws;

import com.ycyw.api.common.exception.ConflictException;
import com.ycyw.api.common.exception.ResourceNotFoundException;
import com.ycyw.api.common.exception.WrongParametersException;
import com.ycyw.api.common.utils.MessageResolver;
import com.ycyw.api.tchat.dto.stomp.ChatDeleteStompPayload;
import com.ycyw.api.tchat.dto.stomp.ChatEditStompPayload;
import com.ycyw.api.tchat.dto.stomp.ChatIdStompPayload;
import com.ycyw.api.tchat.dto.stomp.ChatSendStompPayload;
import com.ycyw.api.tchat.dto.stomp.ChatStompErrorPayload;
import com.ycyw.api.tchat.exception.ChatClosedException;
import com.ycyw.api.tchat.service.ChatService;
import com.ycyw.api.user.model.User;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.security.Principal;
import java.util.stream.Collectors;

/**
 * STOMP application destinations {@code /app/chat.*} — see {@code context/support_chat_api_endpoints.md}.
 * Errors are sent to {@code /user/queue/errors} with {@link ChatStompErrorPayload}.
 */
@Controller
@Validated
public class ChatStompController {

    private final ChatService chatService;
    private final MessageResolver messageResolver;

    public ChatStompController(ChatService chatService, MessageResolver messageResolver) {
        this.chatService = chatService;
        this.messageResolver = messageResolver;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload @Valid ChatSendStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.sendChatMessage(payload.chatId(), user.getId(), payload.content(), payload.clientMessageId());
    }

    @MessageMapping("/chat.edit")
    public void edit(@Payload @Valid ChatEditStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.editChatMessage(payload.chatId(), user.getId(), payload.messageId(), payload.content());
    }

    @MessageMapping("/chat.delete")
    public void delete(@Payload @Valid ChatDeleteStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.deleteChatMessage(payload.chatId(), user.getId(), payload.messageId());
    }

    @MessageMapping("/chat.attach")
    public void attach(@Payload @Valid ChatIdStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.attachAgentToChat(payload.chatId(), user.getId());
    }

    @MessageMapping("/chat.detach")
    public void detach(@Payload @Valid ChatIdStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.detachAgentFromChat(payload.chatId(), user.getId());
    }

    @MessageMapping("/chat.close")
    public void close(@Payload @Valid ChatIdStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.closeChat(payload.chatId(), user.getId());
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload @Valid ChatIdStompPayload payload, Principal principal) {
        User user = requireUser(principal);
        chatService.recordTypingIndicator(payload.chatId(), user);
    }

    // --- Error responses to /user/queue/errors (relative to user prefix) ---

    @MessageExceptionHandler(AccessDeniedException.class)
    @SendToUser("/queue/errors")
    public ChatStompErrorPayload onAccessDenied(AccessDeniedException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "access denied";
        return ChatStompErrorPayload.of("ACCESS_DENIED", msg, null);
    }

    @MessageExceptionHandler(ResourceNotFoundException.class)
    @SendToUser("/queue/errors")
    public ChatStompErrorPayload onNotFound(ResourceNotFoundException ex) {
        return ChatStompErrorPayload.of("MESSAGE_NOT_FOUND", ex.getMessage(), null);
    }

    @MessageExceptionHandler(WrongParametersException.class)
    @SendToUser("/queue/errors")
    public ChatStompErrorPayload onWrongParams(WrongParametersException ex) {
        return ChatStompErrorPayload.of("VALIDATION_ERROR", ex.getMessage(), null);
    }

    @MessageExceptionHandler(ChatClosedException.class)
    @SendToUser("/queue/errors")
    public ChatStompErrorPayload onChatClosed(ChatClosedException ex) {
        return ChatStompErrorPayload.of("CHAT_CLOSED", ex.getMessage(), null);
    }

    @MessageExceptionHandler(ConflictException.class)
    @SendToUser("/queue/errors")
    public ChatStompErrorPayload onConflict(ConflictException ex) {
        String msg =
                ex.getMessageKeys().stream().map(messageResolver::get).collect(Collectors.joining(" "));
        return ChatStompErrorPayload.of("VALIDATION_ERROR", msg, null);
    }

    @MessageExceptionHandler(MethodArgumentNotValidException.class)
    @SendToUser("/queue/errors")
    public ChatStompErrorPayload onValidation(MethodArgumentNotValidException ex) {
        String detail =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(err -> err.getField() + ": " + err.getDefaultMessage())
                        .collect(Collectors.joining("; "));
        return ChatStompErrorPayload.of("VALIDATION_ERROR", detail, null);
    }

    private static User requireUser(Principal principal) {
        if (!(principal instanceof UsernamePasswordAuthenticationToken token)) {
            throw new AccessDeniedException("Not authenticated");
        }
        if (!(token.getPrincipal() instanceof User user)) {
            throw new AccessDeniedException("Invalid principal");
        }
        return user;
    }
}
