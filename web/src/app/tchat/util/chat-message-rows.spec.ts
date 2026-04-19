import { describe, expect, it } from 'vitest';

import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';

import { buildChatMessageRows } from './chat-message-rows';

const m = (id: string, senderId: string): ChatMessageDto => ({
  id,
  chatId: 'c',
  senderId,
  senderUsername: 'u',
  content: 'x',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  edited: false,
});

describe('buildChatMessageRows', () => {
  it('marks first row in group', () => {
    const rows = buildChatMessageRows([m('1', 'a'), m('2', 'a'), m('3', 'b')]);
    expect(rows.map((r) => r.isFirstInGroup)).toEqual([true, false, true]);
  });

  it('empty list', () => {
    expect(buildChatMessageRows([])).toEqual([]);
  });
});
