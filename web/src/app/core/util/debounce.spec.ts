import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounceLeadingEdge } from './debounce';

describe('debounceLeadingEdge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('invokes after delay', () => {
    const fn = vi.fn();
    const d = debounceLeadingEdge(100, fn);
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on repeated calls', () => {
    const fn = vi.fn();
    const d = debounceLeadingEdge(100, fn);
    d();
    vi.advanceTimersByTime(40);
    d();
    vi.advanceTimersByTime(60);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
