import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, switchMap, tap } from 'rxjs';

import { APP_SETTINGS } from '@app/core/config/app-settings';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';

import { AuthTokenStore } from './auth-token.store';
import type { LoginRequestBody, LoginResponseBody, Role, UserProfile } from './auth.models';

const PROFILE_KEY = 'ycyw_user_profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(APP_SETTINGS);
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly router = inject(Router);
  private readonly chatStomp = inject(ChatStompService);

  readonly profile = signal<UserProfile | null>(null);

  readonly isAuthenticated = computed(
    () => this.tokenStore.accessToken() !== null && this.profile() !== null,
  );

  readonly role = computed<Role | null>(() => this.profile()?.role ?? null);

  constructor() {
    this.restoreProfileFromStorage();
    if (this.tokenStore.accessToken() !== null && this.profile() === null) {
      this.tokenStore.setAccessToken(null);
    }
  }

  login(login: string, password: string): Observable<void> {
    const base = this.settings.apiBaseUrl;
    const body: LoginRequestBody = { login: login.trim(), password: password.trim() };
    return this.http.post<LoginResponseBody>(`${base}/auth/login`, body).pipe(
      tap((res) => this.tokenStore.setAccessToken(res.token)),
      switchMap(() => this.http.get<UserProfile>(`${base}/user/profile`)),
      tap((prof) => {
        this.profile.set(prof);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(prof));
      }),
      map(() => undefined),
    );
  }

  logout(): void {
    this.chatStomp.shutdown();
    this.tokenStore.setAccessToken(null);
    this.profile.set(null);
    sessionStorage.removeItem(PROFILE_KEY);
    void this.router.navigate(['/login']);
  }

  /** Navigate after successful login. */
  navigateAfterLogin(): void {
    const r = this.role();
    if (r === 'CLIENT') {
      void this.router.navigate(['/support/chat']);
    } else if (r === 'AGENT') {
      void this.router.navigate(['/agent']);
    } else {
      void this.router.navigate(['/login']);
    }
  }

  private restoreProfileFromStorage(): void {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw || this.tokenStore.accessToken() === null) {
      return;
    }
    try {
      this.profile.set(JSON.parse(raw) as UserProfile);
    } catch {
      this.clearStaleSession();
    }
  }

  private clearStaleSession(): void {
    this.tokenStore.setAccessToken(null);
    this.profile.set(null);
    sessionStorage.removeItem(PROFILE_KEY);
  }
}
