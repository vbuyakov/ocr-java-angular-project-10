package com.ycyw.api.tchat.dto.stomp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ChatEditStompPayload(
        @NotNull UUID chatId,
        @NotNull UUID messageId,
        @NotBlank @Size(max = 1000) String content
) {}
