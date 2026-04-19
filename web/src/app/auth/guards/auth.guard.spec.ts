import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const run = () => TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/x' } as never));

  it('builds login UrlTree when anonymous', () => {
    const tree = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(tree) } },
      ],
    });
    expect(run()).toBe(tree);
  });

  it('allows authenticated users', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    expect(run()).toBe(true);
  });
});
