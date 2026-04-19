import { inject, Injectable, signal } from '@angular/core';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { AuthTokenStore } from '@app/auth/auth-token.store';
import { APP_SETTINGS } from '@app/core/config/app-settings';

import { buildSockJsUrl } from './sock-js-endpoint';

export type ChatStompConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type RegisteredSubscription = {
  readonly destination: string;
  readonly handler: (message: IMessage) => void;
};

@Injectable({ providedIn: 'root' })
export class ChatStompService {
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly settings = inject(APP_SETTINGS);

  readonly status = signal<ChatStompConnectionStatus>('disconnected');

  private client: Client | undefined;
  private readonly registry: RegisteredSubscription[] = [];
  private activeStompSubscriptions: StompSubscription[] = [];

  /** Opens a SockJS + STOMP session when a JWT is present. Safe to call repeatedly. */
  connect(): void {
    const token = this.tokenStore.accessToken();
    if (!token) {
      this.status.set('disconnected');
      return;
    }
    if (this.client?.active) {
      return;
    }
    if (this.client) {
      void this.client.deactivate({ force: true });
      this.client = undefined;
    }

    this.status.set('connecting');
    const sockJsUrl = buildSockJsUrl(this.settings, token);
    const c = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl) as unknown as WebSocket,
      reconnectDelay: 5000,
      connectionTimeout: 15000,
      splitLargeFrames: true,
      connectHeaders: { Authorization: `Bearer ${token}` },
    });

    c.onConnect = () => {
      this.status.set('connected');
      this.refreshLiveSubscriptions();
    };

    c.onDisconnect = () => {
      this.teardownActiveSubscriptions();
    };

    c.onStompError = () => {
      this.status.set('error');
    };

    c.onWebSocketClose = () => {
      if (this.client === c && c.active && this.status() !== 'error') {
        this.status.set('connecting');
      }
    };

    this.client = c;
    c.activate();
  }

  /**
   * Stops STOMP and clears subscriptions (call on logout).
   */
  shutdown(): void {
    this.registry.length = 0;
    this.teardownActiveSubscriptions();
    const c = this.client;
    this.client = undefined;
    if (c) {
      void c.deactivate({ force: true });
    }
    this.status.set('disconnected');
  }

  /**
   * Subscribe to a destination; registrations are replayed after STOMP reconnect.
   * @returns Unsubscribe function (removes this listener and updates STOMP subscriptions).
   */
  subscribe(destination: string, handler: (message: IMessage) => void): () => void {
    const entry: RegisteredSubscription = { destination, handler };
    this.registry.push(entry);
    if (this.client?.connected) {
      this.activeStompSubscriptions.push(this.client.subscribe(destination, handler));
    }
    return () => {
      const idx = this.registry.indexOf(entry);
      if (idx >= 0) {
        this.registry.splice(idx, 1);
      }
      this.refreshLiveSubscriptions();
    };
  }

  publishJson(destination: string, body: unknown): void {
    if (!this.client?.connected) {
      return;
    }
    this.client.publish({ destination, body: JSON.stringify(body) });
  }

  private refreshLiveSubscriptions(): void {
    this.teardownActiveSubscriptions();
    if (!this.client?.connected) {
      return;
    }
    for (const { destination, handler } of this.registry) {
      this.activeStompSubscriptions.push(this.client.subscribe(destination, handler));
    }
  }

  private teardownActiveSubscriptions(): void {
    for (const s of this.activeStompSubscriptions) {
      try {
        s.unsubscribe();
      } catch {
        // subscription may already be disposed during reconnect
      }
    }
    this.activeStompSubscriptions = [];
  }
}
