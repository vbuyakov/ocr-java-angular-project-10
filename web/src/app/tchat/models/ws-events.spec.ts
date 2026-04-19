import { describe, expect, it } from 'vitest';

import {
  parseChatListUpdatedPayload,
  parseChatStompErrorPayload,
  parseChatTopicPayload,
} from './ws-events';

describe('parseChatTopicPayload', () => {
  it('parses MESSAGE_CREATED', () => {
    const json = JSON.stringify({
      type: 'MESSAGE_CREATED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      clientMessageId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      message: {
        id: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
        chatId: '550e8400-e29b-41d4-a716-446655440000',
        senderId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
        senderUsername: 'cust1',
        content: 'Hi',
        status: 'ACTIVE',
        createdAt: '2026-04-18T12:00:00',
        updatedAt: '2026-04-18T12:00:00',
        edited: false,
      },
    });
    const ev = parseChatTopicPayload(json);
    expect(ev).toEqual({
      type: 'MESSAGE_CREATED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      clientMessageId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      message: {
        id: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
        chatId: '550e8400-e29b-41d4-a716-446655440000',
        senderId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
        senderUsername: 'cust1',
        content: 'Hi',
        status: 'ACTIVE',
        createdAt: '2026-04-18T12:00:00',
        updatedAt: '2026-04-18T12:00:00',
        edited: false,
      },
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseChatTopicPayload('not json')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(parseChatTopicPayload(JSON.stringify({ type: 'UNKNOWN' }))).toBeNull();
  });

  it('parses TYPING with username', () => {
    const json = JSON.stringify({
      type: 'TYPING',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      username: 'agent1',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'TYPING',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      username: 'agent1',
    });
  });

  it('parses TYPING_STOPPED', () => {
    const json = JSON.stringify({
      type: 'TYPING_STOPPED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'TYPING_STOPPED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
  });
});

describe('parseChatListUpdatedPayload', () => {
  it('parses CHAT_LIST_UPDATED', () => {
    expect(parseChatListUpdatedPayload(JSON.stringify({ type: 'CHAT_LIST_UPDATED' }))).toEqual({
      type: 'CHAT_LIST_UPDATED',
    });
  });
});

describe('parseChatStompErrorPayload', () => {
  it('parses ERROR', () => {
    expect(
      parseChatStompErrorPayload(
        JSON.stringify({
          type: 'ERROR',
          code: 'CHAT_CLOSED',
          message: 'closed',
          clientMessageId: null,
        }),
      ),
    ).toEqual({
      type: 'ERROR',
      code: 'CHAT_CLOSED',
      message: 'closed',
      clientMessageId: null,
    });
  });
});
