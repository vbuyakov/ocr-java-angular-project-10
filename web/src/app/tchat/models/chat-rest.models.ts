/** REST DTOs for `/api/chat/*` — align with Java records in the API. */

export interface ActiveChatResponse {
  readonly chatId: string;
  readonly status: string;
}

export interface CreateActiveChatRequestBody {
  readonly initialMessage: string;
}

export interface ChatSummaryResponse {
  readonly chatId: string;
  readonly status: string;
  readonly clientId: string;
  readonly clientUsername?: string;
  readonly agentId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ChatListResponse {
  readonly items: ChatSummaryResponse[];
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
}

/** {@code GET /api/agent/chats/bucket-counts} — badge counts for inbox tabs. */
export interface AgentInboxBucketCountsResponse {
  readonly newRequests: number;
  readonly myActive: number;
}

/** Same shape as chat message JSON in REST and STOMP `MESSAGE_*` payloads. */
export interface ChatMessageDto {
  readonly id: string;
  readonly chatId: string;
  readonly senderId: string;
  readonly senderUsername: string;
  readonly content: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly edited: boolean;
}

export interface ChatMessagesResponse {
  readonly messages: ChatMessageDto[];
  readonly hasMore: boolean;
  readonly clientUsername?: string | null;
  readonly chatCreatedAt?: string | null;
}
