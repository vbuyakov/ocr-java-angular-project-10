package com.ycyw.api.tchat.dto;

import java.util.UUID;

public record ActiveChatResponse(UUID chatId, String status) {}
