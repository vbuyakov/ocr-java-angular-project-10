import { describe, expect, it } from 'vitest';

import type { ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';

import { formatChatListLine } from './chat-list-label';

const base = (): ChatSummaryResponse => ({
  chatId: 'c',
  status: 'ACTIVE',
  clientId: 'x',
  agentId: null,
  createdAt: '2026-06-15T14:30:00.000Z',
  updatedAt: '2026-06-15T14:30:00.000Z',
});

describe('formatChatListLine', () => {
  it('uses trimmed client username', () => {
    const s = { ...base(), clientUsername: '  alice  ' };
    expect(formatChatListLine(s)).toMatch(/^alice - \d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/);
  });

  it('uses Client fallback when username missing', () => {
    const s = base();
    expect(formatChatListLine(s)).toMatch(/^Client - /);
  });
});
