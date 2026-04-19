import { describe, expect, it } from 'vitest';

import { ChatDateTimePipe } from './chat-datetime.pipe';

describe('ChatDateTimePipe', () => {
  it('delegates to formatChatDateTime', () => {
    const pipe = new ChatDateTimePipe();
    expect(pipe.transform('invalid')).toBe('invalid');
    expect(pipe.transform('2026-01-01T12:00:00')).toMatch(
      /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/,
    );
  });
});
