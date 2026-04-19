package com.ycyw.api.tchat.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatSummaryResponse(
        UUID chatId,
        String status,
        UUID clientId,
        String clientUsername,
        UUID agentId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
