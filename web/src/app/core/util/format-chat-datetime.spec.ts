import { describe, expect, it } from 'vitest';

import { formatChatDateTime } from './format-chat-datetime';

describe('formatChatDateTime', () => {
  it('formats as DD-MM-YYYY HH:mm:ss in local time', () => {
    const s = formatChatDateTime('2026-04-19T15:30:45');
    expect(s).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/);
  });

  it('returns original string when not parseable', () => {
    expect(formatChatDateTime('not-a-date')).toBe('not-a-date');
  });
});
