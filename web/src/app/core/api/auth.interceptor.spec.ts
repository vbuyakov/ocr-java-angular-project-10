import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthTokenStore } from '@app/auth/auth-token.store';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthTokenStore,
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Bearer token when present', () => {
    TestBed.inject(AuthTokenStore).setAccessToken('tok');
    http.get('/api/x').subscribe();
    const r = httpMock.expectOne('/api/x');
    expect(r.request.headers.get('Authorization')).toBe('Bearer tok');
    r.flush({});
  });

  it('skips header when no token', () => {
    TestBed.inject(AuthTokenStore).setAccessToken(null);
    http.get('/api/x').subscribe();
    const r = httpMock.expectOne('/api/x');
    expect(r.request.headers.has('Authorization')).toBe(false);
    r.flush({});
  });

  it('does not replace existing Authorization', () => {
    TestBed.inject(AuthTokenStore).setAccessToken('tok');
    http.get('/api/x', { headers: { Authorization: 'Bearer preset' } }).subscribe();
    const r = httpMock.expectOne('/api/x');
    expect(r.request.headers.get('Authorization')).toBe('Bearer preset');
    r.flush({});
  });
});
