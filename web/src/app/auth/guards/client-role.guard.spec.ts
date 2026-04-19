import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import type { Role } from '../auth.models';
import { AuthService } from '../auth.service';
import { clientRoleGuard } from './client-role.guard';

describe('clientRoleGuard', () => {
  const run = () => TestBed.runInInjectionContext(() => clientRoleGuard({} as never, { url: '/x' } as never));

  it('sends anonymous users to login', () => {
    const tree = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => false, role: () => null } },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue(tree) } },
      ],
    });
    expect(run()).toBe(tree);
  });

  it('sends non-clients to agent home', () => {
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

  it('allows clients', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true, role: (): Role => 'CLIENT' },
        },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });
    expect(run()).toBe(true);
  });
});
