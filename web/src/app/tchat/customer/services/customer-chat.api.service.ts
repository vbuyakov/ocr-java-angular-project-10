import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';

import { APP_SETTINGS } from '@app/core/config/app-settings';

import type {
  ActiveChatResponse,
  ChatListResponse,
  ChatMessagesResponse,
  CreateActiveChatRequestBody,
} from '@app/tchat/models/chat-rest.models';

@Injectable({ providedIn: 'root' })
export class CustomerChatApiService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(APP_SETTINGS);

  /** 200 with body, or `null` when the client has no active chat (404). */
  getActiveChat(): Observable<ActiveChatResponse | null> {
    const url = `${this.settings.apiBaseUrl}/api/chat/active`;
    return this.http.get<ActiveChatResponse>(url).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of(null);
        }
        return throwError(() => err);
      }),
    );
  }

  /**
   * Creates a chat with an initial message. On **409**, retries by loading the active chat
   * (another tab or race created it).
   */
  createActiveChat(initialMessage: string): Observable<ActiveChatResponse> {
    const url = `${this.settings.apiBaseUrl}/api/chat/active`;
    const body: CreateActiveChatRequestBody = { initialMessage: initialMessage.trim() };
    return this.http.post<ActiveChatResponse>(url, body).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 409) {
          return this.getActiveChat().pipe(
            switchMap((active) =>
              active ? of(active) : throwError(() => err),
            ),
          );
        }
        return throwError(() => err);
      }),
    );
  }

  listArchived(page = 0, size = 20): Observable<ChatListResponse> {
    const url = `${this.settings.apiBaseUrl}/api/chat/archived`;
    return this.http.get<ChatListResponse>(url, { params: { page: String(page), size: String(size) } });
  }

  getMessages(chatId: string, limit = 50): Observable<ChatMessagesResponse> {
    const url = `${this.settings.apiBaseUrl}/api/chat/${encodeURIComponent(chatId)}/messages`;
    return this.http.get<ChatMessagesResponse>(url, { params: { limit: String(limit) } });
  }
}
