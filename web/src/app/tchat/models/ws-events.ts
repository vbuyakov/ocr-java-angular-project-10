/** Mirrors server DTOs for `/topic/chat/{chatId}` (see `ChatWsEvents` in the API). */

import type { ChatMessageDto } from './chat-rest.models';

/** @deprecated Use {@link ChatMessageDto}; kept for older imports. */
export type ChatMessagePayload = ChatMessageDto;

export interface MessageCreatedEvent {
  readonly type: 'MESSAGE_CREATED';
  readonly chatId: string;
  readonly clientMessageId: string;
  readonly message: ChatMessageDto;
}

export interface MessageUpdatedEvent {
  readonly type: 'MESSAGE_UPDATED';
  readonly chatId: string;
  readonly messageId: string;
  readonly content: string;
  readonly updatedAt: string;
}

export interface MessageDeletedEvent {
  readonly type: 'MESSAGE_DELETED';
  readonly chatId: string;
  readonly messageId: string;
  readonly updatedAt: string;
}

export interface ChatStatusEvent {
  readonly type: 'CHAT_STATUS';
  readonly chatId: string;
  readonly status: string;
}

export interface UserJoinedEvent {
  readonly type: 'USER_JOINED';
  readonly chatId: string;
  readonly userId: string;
  readonly timestamp: string;
}

export interface UserLeftEvent {
  readonly type: 'USER_LEFT';
  readonly chatId: string;
  readonly userId: string;
  readonly timestamp: string;
}

export interface TypingEvent {
  readonly type: 'TYPING';
  readonly chatId: string;
  readonly userId: string;
  readonly username?: string;
}

export interface TypingStoppedEvent {
  readonly type: 'TYPING_STOPPED';
  readonly chatId: string;
  readonly userId: string;
}

export type ChatTopicEvent =
  | MessageCreatedEvent
  | MessageUpdatedEvent
  | MessageDeletedEvent
  | ChatStatusEvent
  | UserJoinedEvent
  | UserLeftEvent
  | TypingEvent
  | TypingStoppedEvent;

export interface ChatListUpdatedEvent {
  readonly type: 'CHAT_LIST_UPDATED';
}

export interface ChatStompErrorEvent {
  readonly type: 'ERROR';
  readonly code: string;
  readonly message: string;
  readonly clientMessageId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function readMessage(value: unknown): ChatMessageDto | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const obj = value;
  const id = readString(obj, 'id');
  const chatId = readString(obj, 'chatId');
  const senderId = readString(obj, 'senderId');
  const senderUsername = readString(obj, 'senderUsername');
  const content = readString(obj, 'content');
  const status = readString(obj, 'status');
  const createdAt = readString(obj, 'createdAt');
  const updatedAt = readString(obj, 'updatedAt');
  const edited = obj['edited'];
  if (
    id === undefined ||
    chatId === undefined ||
    senderId === undefined ||
    senderUsername === undefined ||
    content === undefined ||
    status === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    typeof edited !== 'boolean'
  ) {
    return undefined;
  }
  return {
    id,
    chatId,
    senderId,
    senderUsername,
    content,
    status,
    createdAt,
    updatedAt,
    edited,
  };
}

/** Parses a STOMP body from `/topic/chat/{chatId}` into a typed event, or `null` if unknown or invalid. */
export function parseChatTopicPayload(json: string): ChatTopicEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  const type = readString(raw, 'type');
  if (type === undefined) {
    return null;
  }
  switch (type) {
    case 'MESSAGE_CREATED': {
      const chatId = readString(raw, 'chatId');
      const clientMessageId = readString(raw, 'clientMessageId');
      const message = readMessage(raw['message']);
      if (chatId === undefined || clientMessageId === undefined || message === undefined) {
        return null;
      }
      return { type: 'MESSAGE_CREATED', chatId, clientMessageId, message };
    }
    case 'MESSAGE_UPDATED': {
      const chatId = readString(raw, 'chatId');
      const messageId = readString(raw, 'messageId');
      const content = readString(raw, 'content');
      const updatedAt = readString(raw, 'updatedAt');
      if (chatId === undefined || messageId === undefined || content === undefined || updatedAt === undefined) {
        return null;
      }
      return { type: 'MESSAGE_UPDATED', chatId, messageId, content, updatedAt };
    }
    case 'MESSAGE_DELETED': {
      const chatId = readString(raw, 'chatId');
      const messageId = readString(raw, 'messageId');
      const updatedAt = readString(raw, 'updatedAt');
      if (chatId === undefined || messageId === undefined || updatedAt === undefined) {
        return null;
      }
      return { type: 'MESSAGE_DELETED', chatId, messageId, updatedAt };
    }
    case 'CHAT_STATUS': {
      const chatId = readString(raw, 'chatId');
      const status = readString(raw, 'status');
      if (chatId === undefined || status === undefined) {
        return null;
      }
      return { type: 'CHAT_STATUS', chatId, status };
    }
    case 'USER_JOINED':
    case 'USER_LEFT': {
      const chatId = readString(raw, 'chatId');
      const userId = readString(raw, 'userId');
      const timestamp = readString(raw, 'timestamp');
      if (chatId === undefined || userId === undefined || timestamp === undefined) {
        return null;
      }
      return type === 'USER_JOINED'
        ? { type: 'USER_JOINED', chatId, userId, timestamp }
        : { type: 'USER_LEFT', chatId, userId, timestamp };
    }
    case 'TYPING': {
      const chatId = readString(raw, 'chatId');
      const userId = readString(raw, 'userId');
      if (chatId === undefined || userId === undefined) {
        return null;
      }
      const username = readString(raw, 'username');
      return username === undefined
        ? { type: 'TYPING', chatId, userId }
        : { type: 'TYPING', chatId, userId, username };
    }
    case 'TYPING_STOPPED': {
      const chatId = readString(raw, 'chatId');
      const userId = readString(raw, 'userId');
      if (chatId === undefined || userId === undefined) {
        return null;
      }
      return { type: 'TYPING_STOPPED', chatId, userId };
    }
    default:
      return null;
  }
}

/** `/user/queue/chats` refresh signal. */
export function parseChatListUpdatedPayload(json: string): ChatListUpdatedEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw) || readString(raw, 'type') !== 'CHAT_LIST_UPDATED') {
    return null;
  }
  return { type: 'CHAT_LIST_UPDATED' };
}

/** `/user/queue/errors` envelope. */
export function parseChatStompErrorPayload(json: string): ChatStompErrorEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  if (readString(raw, 'type') !== 'ERROR') {
    return null;
  }
  const code = readString(raw, 'code');
  const message = readString(raw, 'message');
  if (code === undefined || message === undefined) {
    return null;
  }
  const cmid = raw['clientMessageId'];
  const clientMessageId =
    cmid === null ? null : typeof cmid === 'string' && cmid.length > 0 ? cmid : null;
  return { type: 'ERROR', code, message, clientMessageId };
}
