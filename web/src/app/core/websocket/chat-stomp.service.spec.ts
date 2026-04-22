import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthTokenStore } from '@app/auth/auth-token.store';
import { APP_SETTINGS, type AppSettings } from '@app/core/config/app-settings';

vi.mock('@stomp/stompjs', () => {
  class MockClient {
    active = false;
    connected = false;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onStompError?: () => void;
    onWebSocketClose?: () => void;

    activate(): void {
      this.active = true;
      queueMicrotask(() => {
        this.connected = true;
        this.onConnect?.();
      });
    }

    deactivate(): Promise<void> {
      this.active = false;
      this.connected = false;
      return Promise.resolve();
    }

    subscribe = vi.fn(() => ({
      unsubscribe: vi.fn(),
    }));

    publish = vi.fn();
  }

  return { Client: MockClient };
});

vi.mock('sockjs-client', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

import { ChatStompService } from './chat-stomp.service';

async function flushConnection(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ChatStompService', () => {
  const settings: AppSettings = {
    production: false,
    apiBaseUrl: 'http://localhost:8080',
    wsUrl: '',
    maxChatMessageChars: 1,
    defaultLocale: 'en',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ChatStompService,
        AuthTokenStore,
        { provide: APP_SETTINGS, useValue: settings },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(ChatStompService).shutdown();
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('connect does nothing when there is no JWT', () => {
    const stomp = TestBed.inject(ChatStompService);
    stomp.connect();
    expect(stomp.status()).toBe('disconnected');
  });

  it('shutdown is safe when never connected', () => {
    const stomp = TestBed.inject(ChatStompService);
    stomp.shutdown();
    expect(stomp.status()).toBe('disconnected');
  });

  it('connect reaches connected when JWT is present', async () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-1');
    stomp.connect();
    expect(stomp.status()).toBe('connecting');
    await flushConnection();
    expect(stomp.status()).toBe('connected');
  });

  it('subscribe is replayed after connect', async () => {
    const stomp = TestBed.inject(ChatStompService);
    const store = TestBed.inject(AuthTokenStore);
    store.setAccessToken('jwt-2');
    const handler = vi.fn();
    stomp.subscribe('/topic/a', handler);
    stomp.connect();
    await flushConnection();
    const client = (stomp as unknown as { client: { subscribe: ReturnType<typeof vi.fn> } }).client;
    expect(client?.subscribe).toHaveBeenCalledWith('/topic/a', handler);
  });

  it('publishJson no-ops before the client reports connected', () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-pub-early');
    stomp.connect();
    const client = (stomp as unknown as { client: { publish: ReturnType<typeof vi.fn> } }).client;
    stomp.publishJson('/app/x', { a: 1 });
    expect(client?.publish).not.toHaveBeenCalled();
  });

  it('publishJson sends when connected', async () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-3');
    stomp.connect();
    await flushConnection();
    const client = (stomp as unknown as { client: { publish: ReturnType<typeof vi.fn> } }).client;
    stomp.publishJson('/app/x', { a: 1 });
    expect(client?.publish).toHaveBeenCalledWith({
      destination: '/app/x',
      body: JSON.stringify({ a: 1 }),
    });
  });

  it('returned unsubscribe tears down the stomp subscription', async () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-4');
    stomp.connect();
    await flushConnection();
    const client = (stomp as unknown as { client: { subscribe: ReturnType<typeof vi.fn> } }).client;
    const stompUnsub = vi.fn();
    client?.subscribe.mockImplementation(() => ({ unsubscribe: stompUnsub }));
    const off = stomp.subscribe('/topic/b', vi.fn());
    expect(client?.subscribe).toHaveBeenCalled();
    off();
    expect(stompUnsub).toHaveBeenCalled();
  });

  it('second connect while active is a no-op', async () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-5');
    stomp.connect();
    await flushConnection();
    const first = (stomp as unknown as { client: unknown }).client;
    stomp.connect();
    const second = (stomp as unknown as { client: unknown }).client;
    expect(second).toBe(first);
  });

  it('onStompError sets status error', async () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-6');
    stomp.connect();
    const client = (stomp as unknown as { client: { onStompError?: () => void } }).client;
    client?.onStompError?.();
    expect(stomp.status()).toBe('error');
  });

  it('onWebSocketClose moves to connecting when the socket drops while active', async () => {
    const stomp = TestBed.inject(ChatStompService);
    TestBed.inject(AuthTokenStore).setAccessToken('jwt-ws-close');
    stomp.connect();
    await flushConnection();
    expect(stomp.status()).toBe('connected');
    const client = (stomp as unknown as { client: { onWebSocketClose?: () => void; active: boolean } }).client;
    client!.active = true;
    client?.onWebSocketClose?.();
    expect(stomp.status()).toBe('connecting');
  });
});
