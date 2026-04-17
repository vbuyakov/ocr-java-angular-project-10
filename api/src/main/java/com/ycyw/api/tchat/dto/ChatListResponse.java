package com.ycyw.api.tchat.dto;

import java.util.List;

public record ChatListResponse(List<ChatSummaryResponse> items, boolean hasMore, String nextCursor) {}
