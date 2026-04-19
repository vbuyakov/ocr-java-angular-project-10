import { describe, expect, it, vi } from 'vitest';

import { scrollChatThreadToBottom } from './scroll-thread';

describe('scrollChatThreadToBottom', () => {
  it('no-ops without container', () => {
    scrollChatThreadToBottom(null);
    scrollChatThreadToBottom(undefined);
  });

  it('scrolls to bottom after rAF', async () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 420 });
    el.scrollTop = 0;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    scrollChatThreadToBottom(el);
    await Promise.resolve();

    expect(el.scrollTop).toBe(420);
    vi.restoreAllMocks();
  });
});
