import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import type { Role } from '../auth.models';
import { AuthService } from '../auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  const run = () => TestBed.runInInjectionContext(() => guestGuard({} as never, { url: '/login' } as never));

  it('allows guests', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => false, role: () => null } },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    expect(run()).toBe(true);
  });

  it('redirects client to support chat', () => {
    const tree = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true, role: (): Role => 'CLIENT' },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(tree) } },
      ],
    });
    expect(run()).toBe(tree);
  });

  it('redirects agent to inbox', () => {
    const tree = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true, role: (): Role => 'AGENT' },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(tree) } },
      ],
    });
    expect(run()).toBe(tree);
  });

  it('redirects authenticated user with unknown role to login', () => {
    const tree = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => true, role: () => null } },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(tree) } },
      ],
    });
    expect(run()).toBe(tree);
  });
});
