package com.ycyw.api.tchat.dto.stomp;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ChatDeleteStompPayload(@NotNull UUID chatId, @NotNull UUID messageId) {}
