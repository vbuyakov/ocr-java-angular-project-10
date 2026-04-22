import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'ycyw_access_token';

/**
 * JWT bearer token only — used by the HTTP interceptor. Avoids a circular dependency
 * with {@link AuthService} (which uses HttpClient).
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  readonly accessToken = signal<string | null>(null);

  constructor() {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      this.accessToken.set(stored);
    }
  }

  setAccessToken(token: string | null): void {
    this.accessToken.set(token);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}
