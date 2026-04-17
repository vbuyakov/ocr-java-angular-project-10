package com.ycyw.api.tchat.dto.stomp;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Shared body for attach, detach, close, typing (chatId only). */
public record ChatIdStompPayload(@NotNull UUID chatId) {}
