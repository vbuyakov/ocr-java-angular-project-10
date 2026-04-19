import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@app/auth/auth.service';
import { APP_SETTINGS, type AppSettings } from '@app/core/config/app-settings';

import { MainLayoutComponent } from './main-layout.component';

const baseSettings: AppSettings = {
  production: false,
  apiBaseUrl: '',
  wsUrl: '',
  maxChatMessageChars: 2000,
  defaultLocale: 'en',
};

describe('MainLayoutComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  function configure(auth: {
    isAuthenticated: () => boolean;
    profile: () => { id: string; username: string; email: string; role: 'CLIENT' | 'AGENT' } | null;
    role: () => 'CLIENT' | 'AGENT' | null;
    logout: ReturnType<typeof vi.fn>;
  }, settings: AppSettings) {
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: APP_SETTINGS, useValue: settings },
        { provide: AuthService, useValue: auth },
      ],
    });
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    return { fixture, auth };
  }

  it('shows guest nav, login link, and /login brand target', () => {
    const logout = vi.fn();
    const { fixture } = configure(
      {
        isAuthenticated: () => false,
        profile: () => null,
        role: () => null,
        logout,
      },
      baseSettings,
    );

    expect(fixture.debugElement.query(By.css('[data-testid="nav-login"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="nav-username"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="nav-dev-ui"]'))).toBeTruthy();

    const brand = fixture.debugElement.query(By.css('a.app-brand')).nativeElement as HTMLAnchorElement;
    expect(brand.getAttribute('href')).toBe('/login');
  });

  it('hides dev UI link in production', () => {
    const { fixture } = configure(
      {
        isAuthenticated: () => false,
        profile: () => null,
        role: () => null,
        logout: vi.fn(),
      },
      { ...baseSettings, production: true },
    );

    expect(fixture.debugElement.query(By.css('[data-testid="nav-dev-ui"]'))).toBeNull();
  });

  it('shows client links and brand targets support chat', () => {
    const logout = vi.fn();
    const { fixture } = configure(
      {
        isAuthenticated: () => true,
        profile: () => ({ id: '1', username: 'cust', email: 'c@c', role: 'CLIENT' }),
        role: () => 'CLIENT',
        logout,
      },
      baseSettings,
    );

    expect(fixture.debugElement.query(By.css('[data-testid="nav-support-chat"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="nav-support-archived"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="nav-agent-inbox"]'))).toBeNull();

    const brand = fixture.debugElement.query(By.css('a.app-brand')).nativeElement as HTMLAnchorElement;
    expect(brand.getAttribute('href')).toBe('/support/chat');
  });

  it('shows agent links and brand targets agent inbox', () => {
    const logout = vi.fn();
    const { fixture } = configure(
      {
        isAuthenticated: () => true,
        profile: () => ({ id: '2', username: 'ag', email: 'a@a', role: 'AGENT' }),
        role: () => 'AGENT',
        logout,
      },
      baseSettings,
    );

    expect(fixture.debugElement.query(By.css('[data-testid="nav-agent-inbox"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="nav-agent-archived"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="nav-support-chat"]'))).toBeNull();

    const brand = fixture.debugElement.query(By.css('a.app-brand')).nativeElement as HTMLAnchorElement;
    expect(brand.getAttribute('href')).toBe('/agent');
  });

  it('calls auth.logout when sign out is clicked', () => {
    const logout = vi.fn();
    const { fixture } = configure(
      {
        isAuthenticated: () => true,
        profile: () => ({ id: '1', username: 'u', email: 'e', role: 'CLIENT' }),
        role: () => 'CLIENT',
        logout,
      },
      baseSettings,
    );

    fixture.debugElement.query(By.css('[data-testid="nav-logout"]')).nativeElement.click();
    expect(logout).toHaveBeenCalled();
  });
});
