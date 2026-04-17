package com.ycyw.api.tchat.web.rest;

import com.ycyw.api.tchat.dto.ActiveChatResponse;
import com.ycyw.api.tchat.dto.ChatListResponse;
import com.ycyw.api.tchat.dto.ChatMessagesResponse;
import com.ycyw.api.tchat.dto.CreateActiveChatRequest;
import com.ycyw.api.tchat.service.ChatService;
import com.ycyw.api.user.model.User;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Client-oriented chat HTTP API under {@code /api/chat}. Agent queue lists (new / my / others / archived)
 * are on {@link AgentChatRestController} — {@code GET /api/agent/chats?bucket=…}.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    private final ChatService chatService;

    public ChatRestController(ChatService chatService) {
        this.chatService = chatService;
    }

    /** Returns the current non-closed chat, or 404 if none (UI then collects initial message and calls POST). */
    @GetMapping("/active")
    @PreAuthorize("hasRole('CLIENT')")
    public ActiveChatResponse getActiveChat(@AuthenticationPrincipal User user) {
        return chatService.getActiveChat(user.getId());
    }

    /** Creates a new chat with a required initial message. 409 if a non-closed chat already exists. */
    @PostMapping("/active")
    @PreAuthorize("hasRole('CLIENT')")
    public ActiveChatResponse createActiveChat(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateActiveChatRequest request) {
        return chatService.createActiveChatWithInitialMessage(user.getId(), request.initialMessage());
    }

    @GetMapping("/archived")
    @PreAuthorize("hasRole('CLIENT')")
    public ChatListResponse listArchived(
            @AuthenticationPrincipal User user, @PageableDefault(size = 20) Pageable pageable) {
        return chatService.listArchivedForClient(user.getId(), pageable);
    }

    @GetMapping("/{chatId}/messages")
    @PreAuthorize("hasRole('CLIENT') or hasRole('AGENT')")
    public ChatMessagesResponse getMessages(
            @AuthenticationPrincipal User user,
            @PathVariable UUID chatId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) UUID before,
            @RequestParam(required = false) UUID after) {
        return chatService.getMessages(chatId, user.getId(), limit, before, after);
    }
}
