import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthTokenStore } from './auth-token.store';

describe('AuthTokenStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('setAccessToken persists and clears localStorage', () => {
    TestBed.configureTestingModule({ providers: [AuthTokenStore] });
    const store = TestBed.inject(AuthTokenStore);
    store.setAccessToken('jwt');
    expect(store.accessToken()).toBe('jwt');
    expect(localStorage.getItem('ycyw_access_token')).toBe('jwt');
    store.setAccessToken(null);
    expect(store.accessToken()).toBeNull();
    expect(localStorage.getItem('ycyw_access_token')).toBeNull();
  });

  it('restores token from localStorage on construction', () => {
    localStorage.setItem('ycyw_access_token', 'from-storage');
    TestBed.configureTestingModule({ providers: [AuthTokenStore] });
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBe('from-storage');
  });
});
