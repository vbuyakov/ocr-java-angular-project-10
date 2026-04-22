import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, afterEach, beforeEach, expect, it, vi } from 'vitest';

import { APP_SETTINGS } from '@app/core/config/app-settings';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';

import { AuthService } from './auth.service';
import { AuthTokenStore } from './auth-token.store';

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let service: AuthService;
  const stompShutdown = vi.fn();
  let navigateMock: ReturnType<typeof vi.fn>;

  const settings = {
    production: false,
    apiBaseUrl: 'http://api.test',
    wsUrl: '',
    maxChatMessageChars: 2000,
    defaultLocale: 'en' as const,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    navigateMock = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AuthTokenStore,
        { provide: APP_SETTINGS, useValue: settings },
        { provide: Router, useValue: { navigate: navigateMock } },
        {
          provide: ChatStompService,
          useValue: { shutdown: stompShutdown, connect: vi.fn() },
        },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    stompShutdown.mockClear();
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('isAuthenticated and role reflect token and profile', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.role()).toBeNull();

    service.login('u', 'p').subscribe();
    httpMock.expectOne('http://api.test/auth/login').flush({ token: 'jwt' });
    httpMock
      .expectOne('http://api.test/user/profile')
      .flush({ id: '1', username: 'u', email: 'e', role: 'AGENT' });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.role()).toBe('AGENT');
  });

  it('login stores token and profile', () => {
    let done = false;
    service.login(' user ', ' secret ').subscribe(() => {
      done = true;
      expect(service.profile()?.username).toBe('cust');
      expect(TestBed.inject(AuthTokenStore).accessToken()).toBe('jwt-1');
    });

    const loginReq = httpMock.expectOne('http://api.test/auth/login');
    expect(loginReq.request.body).toEqual({ login: 'user', password: 'secret' });
    loginReq.flush({ token: 'jwt-1' });

    httpMock
      .expectOne('http://api.test/user/profile')
      .flush({ id: '1', username: 'cust', email: 'c@c.com', role: 'CLIENT' });

    expect(done).toBe(true);
  });

  it('logout clears token, profile, and stops STOMP', () => {
    service.login('u', 'p').subscribe();
    httpMock.expectOne('http://api.test/auth/login').flush({ token: 'jwt' });
    httpMock
      .expectOne('http://api.test/user/profile')
      .flush({ id: '1', username: 'u', email: 'e', role: 'CLIENT' });

    service.logout();

    expect(stompShutdown).toHaveBeenCalled();
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBeNull();
    expect(service.profile()).toBeNull();
    expect(localStorage.getItem('ycyw_user_profile')).toBeNull();
  });

  it('navigateAfterLogin routes by role', () => {
    service.login('u', 'p').subscribe();
    httpMock.expectOne('http://api.test/auth/login').flush({ token: 'jwt' });
    httpMock
      .expectOne('http://api.test/user/profile')
      .flush({ id: '1', username: 'u', email: 'e', role: 'CLIENT' });
    navigateMock.mockClear();
    service.navigateAfterLogin();
    expect(navigateMock).toHaveBeenCalledWith(['/support/chat']);

    service.login('a', 'p').subscribe();
    httpMock.expectOne('http://api.test/auth/login').flush({ token: 'jwt2' });
    httpMock
      .expectOne('http://api.test/user/profile')
      .flush({ id: '2', username: 'ag', email: 'a@a.com', role: 'AGENT' });
    navigateMock.mockClear();
    service.navigateAfterLogin();
    expect(navigateMock).toHaveBeenCalledWith(['/agent']);
  });

  it('navigateAfterLogin sends unknown role to login', () => {
    TestBed.inject(AuthTokenStore).setAccessToken('orphan');
    (service as unknown as { profile: { set: (v: null) => void } }).profile.set(null);
    navigateMock.mockClear();
    service.navigateAfterLogin();
    expect(navigateMock).toHaveBeenCalledWith(['/login']);
  });

  it('clears session when stored profile JSON is invalid', () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    localStorage.setItem('ycyw_user_profile', '{not-json');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AuthTokenStore,
        { provide: APP_SETTINGS, useValue: settings },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ChatStompService, useValue: { shutdown: vi.fn(), connect: vi.fn() } },
      ],
    });
    TestBed.inject(AuthTokenStore).setAccessToken('tok');
    const fresh = TestBed.inject(AuthService);
    expect(fresh.profile()).toBeNull();
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBeNull();
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('clears orphan token when no profile is stored', () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AuthTokenStore,
        { provide: APP_SETTINGS, useValue: settings },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ChatStompService, useValue: { shutdown: vi.fn(), connect: vi.fn() } },
      ],
    });
    TestBed.inject(AuthTokenStore).setAccessToken('orphan-no-profile');
    const fresh = TestBed.inject(AuthService);
    expect(fresh.profile()).toBeNull();
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBeNull();
    httpMock = TestBed.inject(HttpTestingController);
  });
});
