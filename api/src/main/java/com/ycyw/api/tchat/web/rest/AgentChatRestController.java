package com.ycyw.api.tchat.web.rest;

import com.ycyw.api.tchat.dto.ChatListResponse;
import com.ycyw.api.tchat.model.AgentChatBucket;
import com.ycyw.api.tchat.service.ChatService;
import com.ycyw.api.user.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Agent chat lists: {@code GET /api/agent/chats?bucket=NEW_REQUESTS|MY_ACTIVE|OTHERS_ACTIVE|ARCHIVED}
 * (pagination: {@code page}, {@code size}). Customer-facing routes live in {@link ChatRestController}.
 */
@RestController
@RequestMapping("/api/agent/chats")
public class AgentChatRestController {

    private final ChatService chatService;

    public AgentChatRestController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    @PreAuthorize("hasRole('AGENT')")
    public ChatListResponse listForAgent(
            @AuthenticationPrincipal User user,
            @RequestParam AgentChatBucket bucket,
            @PageableDefault(size = 50) Pageable pageable) {
        return chatService.listChatsForAgent(user.getId(), bucket, pageable);
    }
}
