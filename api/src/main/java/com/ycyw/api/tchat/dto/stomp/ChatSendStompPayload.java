package com.ycyw.api.tchat.dto.stomp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ChatSendStompPayload(
        @NotNull UUID chatId,
        @NotNull UUID clientMessageId,
        @NotBlank @Size(max = 1000) String content
) {}
