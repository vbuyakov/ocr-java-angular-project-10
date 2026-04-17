package com.ycyw.api.tchat.service;

import com.ycyw.api.common.exception.ResourceNotFoundException;
import com.ycyw.api.user.model.User;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Authorization for inbound STOMP frames (CONNECT, SUBSCRIBE). Delegates participant rules to
 * {@link ChatAccessService}; keeps {@link com.ycyw.api.tchat.config.ChatInboundStompChannelInterceptor}
 * thin.
 */
@Service
public class ChatStompInboundAuthorizationService {

    private static final Pattern CHAT_TOPIC_DESTINATION = Pattern.compile("^/topic/chat/([a-fA-F0-9-]{36})$");

    private final ChatAccessService chatAccessService;

    public ChatStompInboundAuthorizationService(ChatAccessService chatAccessService) {
        this.chatAccessService = chatAccessService;
    }

    /**
     * @return {@code true} if the frame may be sent on the channel; {@code false} to drop it
     */
    public boolean isInboundStompAllowed(StompHeaderAccessor accessor) {
        StompCommand command = accessor.getCommand();
        if (command == null) {
            return true;
        }
        if (StompCommand.CONNECT.equals(command)) {
            return resolveAuthenticatedUserId(accessor) != null;
        }
        if (!StompCommand.SUBSCRIBE.equals(command)) {
            return true;
        }
        return isSubscribeAllowed(accessor);
    }

    private boolean isSubscribeAllowed(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return false;
        }
        if (destination.startsWith("/user/")) {
            return resolveAuthenticatedUserId(accessor) != null;
        }
        Matcher chatTopic = CHAT_TOPIC_DESTINATION.matcher(destination);
        if (chatTopic.matches()) {
            UUID userId = resolveAuthenticatedUserId(accessor);
            if (userId == null) {
                return false;
            }
            UUID chatId = UUID.fromString(chatTopic.group(1));
            try {
                chatAccessService.validateParticipant(chatId, userId);
            } catch (AccessDeniedException | ResourceNotFoundException e) {
                return false;
            }
            return true;
        }
        if (destination.startsWith("/topic/")) {
            return false;
        }
        return true;
    }

    private static UUID resolveAuthenticatedUserId(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            return null;
        }
        if (principal instanceof UsernamePasswordAuthenticationToken token) {
            if (token.getPrincipal() instanceof User user) {
                return user.getId();
            }
        }
        return null;
    }
}
