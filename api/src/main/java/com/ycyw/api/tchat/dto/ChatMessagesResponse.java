package com.ycyw.api.tchat.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ChatMessagesResponse(
        List<ChatMessageResponse> messages,
        boolean hasMore,
        String clientUsername,
        LocalDateTime chatCreatedAt,
        String chatStatus) {}
