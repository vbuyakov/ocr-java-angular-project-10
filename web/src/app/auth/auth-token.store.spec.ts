import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthTokenStore } from './auth-token.store';

describe('AuthTokenStore', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('setAccessToken persists and clears sessionStorage', () => {
    TestBed.configureTestingModule({ providers: [AuthTokenStore] });
    const store = TestBed.inject(AuthTokenStore);
    store.setAccessToken('jwt');
    expect(store.accessToken()).toBe('jwt');
    expect(sessionStorage.getItem('ycyw_access_token')).toBe('jwt');
    store.setAccessToken(null);
    expect(store.accessToken()).toBeNull();
    expect(sessionStorage.getItem('ycyw_access_token')).toBeNull();
  });

  it('restores token from sessionStorage on construction', () => {
    sessionStorage.setItem('ycyw_access_token', 'from-storage');
    TestBed.configureTestingModule({ providers: [AuthTokenStore] });
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBe('from-storage');
  });
});
