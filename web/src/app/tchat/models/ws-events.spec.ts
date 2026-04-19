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

  it('returns null when MESSAGE_CREATED is incomplete', () => {
    expect(
      parseChatTopicPayload(JSON.stringify({ type: 'MESSAGE_CREATED', chatId: 'c', clientMessageId: 'x' })),
    ).toBeNull();
  });

  it('returns null when payload is not an object', () => {
    expect(parseChatTopicPayload(JSON.stringify('string'))).toBeNull();
  });

  it('returns null when type field missing', () => {
    expect(parseChatTopicPayload(JSON.stringify({ chatId: 'c' }))).toBeNull();
  });

  it('parses TYPING without username', () => {
    const json = JSON.stringify({
      type: 'TYPING',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'TYPING',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
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

  it('parses CHAT_STATUS', () => {
    const json = JSON.stringify({
      type: 'CHAT_STATUS',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'CLOSED',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'CHAT_STATUS',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'CLOSED',
    });
  });

  it('parses MESSAGE_UPDATED', () => {
    const json = JSON.stringify({
      type: 'MESSAGE_UPDATED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      messageId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: 'edited',
      updatedAt: '2026-04-18T13:00:00',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'MESSAGE_UPDATED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      messageId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: 'edited',
      updatedAt: '2026-04-18T13:00:00',
    });
  });

  it('parses MESSAGE_DELETED', () => {
    const json = JSON.stringify({
      type: 'MESSAGE_DELETED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      messageId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      updatedAt: '2026-04-18T12:00:00',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'MESSAGE_DELETED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      messageId: '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      updatedAt: '2026-04-18T12:00:00',
    });
  });

  it('parses USER_LEFT', () => {
    const json = JSON.stringify({
      type: 'USER_LEFT',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      timestamp: '2026-04-18T12:00:00',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'USER_LEFT',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      timestamp: '2026-04-18T12:00:00',
    });
  });

  it('parses USER_JOINED', () => {
    const json = JSON.stringify({
      type: 'USER_JOINED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      timestamp: '2026-04-18T12:00:00',
    });
    expect(parseChatTopicPayload(json)).toEqual({
      type: 'USER_JOINED',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      timestamp: '2026-04-18T12:00:00',
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

  it('returns null for invalid payload', () => {
    expect(parseChatListUpdatedPayload('')).toBeNull();
  });
});

describe('parseChatStompErrorPayload', () => {
  it('returns null for invalid JSON', () => {
    expect(parseChatStompErrorPayload('{')).toBeNull();
  });

  it('returns null when not ERROR type', () => {
    expect(parseChatStompErrorPayload(JSON.stringify({ type: 'OTHER' }))).toBeNull();
  });

  it('returns null when ERROR missing fields', () => {
    expect(parseChatStompErrorPayload(JSON.stringify({ type: 'ERROR', code: 'X' }))).toBeNull();
  });

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
