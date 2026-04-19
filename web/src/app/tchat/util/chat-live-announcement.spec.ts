import { describe, expect, it } from 'vitest';

import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';

import { nextMessageLiveAnnouncement } from './chat-live-announcement';

const msg = (partial: Partial<ChatMessageDto> & Pick<ChatMessageDto, 'id' | 'content'>): ChatMessageDto => ({
  chatId: 'c1',
  senderId: 's1',
  senderUsername: 'alice',
  status: 'ACTIVE',
  createdAt: '2026-04-18T12:00:00',
  updatedAt: '2026-04-18T12:00:00',
  edited: false,
  ...partial,
});

describe('nextMessageLiveAnnouncement', () => {
  const t = (key: string, params?: Record<string, string | number>): string => {
    if (key === 'chat.someone') {
      return 'Someone';
    }
    if (key === 'chat.liveNewMessage' && params) {
      return `NEW:${params['who']}:${params['preview']}`;
    }
    return key;
  };

  it('returns null when count does not increase', () => {
    const list = [msg({ id: '1', content: 'a' })];
    expect(nextMessageLiveAnnouncement(1, list, t)).toEqual({ count: 1, text: null });
  });

  it('announces when a message is appended', () => {
    const list = [msg({ id: '1', content: 'a' }), msg({ id: '2', content: 'hello' })];
    expect(nextMessageLiveAnnouncement(1, list, t)).toEqual({
      count: 2,
      text: 'NEW:alice:hello',
    });
  });

  it('uses someone fallback when username missing', () => {
    const list = [
      msg({ id: '1', content: 'a', senderUsername: '' }),
      msg({ id: '2', content: 'b', senderUsername: '' }),
    ];
    const r = nextMessageLiveAnnouncement(1, list, t);
    expect(r.text).toBe('NEW:Someone:b');
  });

  it('truncates long previews', () => {
    const long = 'x'.repeat(100);
    const list = [msg({ id: '1', content: 'a' }), msg({ id: '2', content: long })];
    const r = nextMessageLiveAnnouncement(1, list, t);
    expect(r.text).toContain('…');
    expect((r.text ?? '').length).toBeLessThan(long.length + 20);
  });
});
