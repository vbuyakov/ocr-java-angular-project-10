import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { APP_SETTINGS, type AppSettings } from '@app/core/config/app-settings';

import { devOnlyGuard } from './dev-only.guard';

const settings = (production: boolean): AppSettings => ({
  production,
  apiBaseUrl: '',
  wsUrl: '',
  maxChatMessageChars: 1,
  defaultLocale: 'en',
});

describe('devOnlyGuard', () => {
  const run = () => TestBed.runInInjectionContext(() => devOnlyGuard({} as never, { url: '/dev' } as never));

  it('blocks when production', () => {
    const tree = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_SETTINGS, useValue: settings(true) },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(tree) } },
      ],
    });
    expect(run()).toBe(tree);
  });

  it('allows when not production', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_SETTINGS, useValue: settings(false) },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    expect(run()).toBe(true);
  });
});
