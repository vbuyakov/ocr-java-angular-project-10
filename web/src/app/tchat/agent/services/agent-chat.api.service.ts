import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_SETTINGS } from '@app/core/config/app-settings';
import type { AgentChatBucket } from '@app/tchat/models/agent-chat.models';
import type {
  AgentInboxBucketCountsResponse,
  ChatListResponse,
  ChatMessagesResponse,
  ChatSummaryResponse,
} from '@app/tchat/models/chat-rest.models';

@Injectable({ providedIn: 'root' })
export class AgentChatApiService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(APP_SETTINGS);

  listChats(bucket: AgentChatBucket, page = 0, size = 50): Observable<ChatListResponse> {
    const url = `${this.settings.apiBaseUrl}/api/agent/chats`;
    return this.http.get<ChatListResponse>(url, {
      params: { bucket, page: String(page), size: String(size) },
    });
  }

  getInboxBucketCounts(): Observable<AgentInboxBucketCountsResponse> {
    const url = `${this.settings.apiBaseUrl}/api/agent/chats/bucket-counts`;
    return this.http.get<AgentInboxBucketCountsResponse>(url);
  }

  getChatSummary(chatId: string): Observable<ChatSummaryResponse> {
    const url = `${this.settings.apiBaseUrl}/api/agent/chats/${encodeURIComponent(chatId)}`;
    return this.http.get<ChatSummaryResponse>(url);
  }

  getMessages(chatId: string, limit = 50): Observable<ChatMessagesResponse> {
    const url = `${this.settings.apiBaseUrl}/api/chat/${encodeURIComponent(chatId)}/messages`;
    return this.http.get<ChatMessagesResponse>(url, { params: { limit: String(limit) } });
  }
}
