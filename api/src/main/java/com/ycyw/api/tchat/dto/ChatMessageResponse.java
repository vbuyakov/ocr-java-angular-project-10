package com.ycyw.api.tchat.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID chatId,
        UUID senderId,
        /** Display name for UI (same as {@code User#getUsername()}). */
        String senderUsername,
        String content,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        /** True if the message body was edited after send. */
        boolean edited) {}
