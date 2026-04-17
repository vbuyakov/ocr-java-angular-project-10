package com.ycyw.api.tchat.dto;

import java.util.List;

public record ChatMessagesResponse(List<ChatMessageResponse> messages, boolean hasMore) {}
