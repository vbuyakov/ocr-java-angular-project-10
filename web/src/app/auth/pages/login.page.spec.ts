import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { I18nService } from '@app/core/i18n/i18n.service';

import { AuthService } from '../auth.service';
import { LoginPageComponent } from './login.page';

describe('LoginPageComponent', () => {
  const authMock = { login: vi.fn(), navigateAfterLogin: vi.fn() };

  beforeEach(() => {
    authMock.login.mockClear();
    authMock.navigateAfterLogin.mockClear();
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: authMock,
        },
        {
          provide: I18nService,
          useValue: {
            i18nVersion: signal(0),
            locale: signal('en'),
            translate: (k: string) =>
              ({
                'login.errorRequired': 'Enter username and password.',
                'login.title': 'Sign in',
                'login.lead': 'Lead',
                'login.usernameLabel': 'User',
                'login.usernamePlaceholder': 'u',
                'login.passwordLabel': 'Pass',
                'login.passwordPlaceholder': 'p',
                'login.submit': 'Go',
                'login.submitting': '…',
                'login.errorFailed': 'Failed',
              })[k] ?? k,
          } satisfies Pick<I18nService, 'translate' | 'i18nVersion' | 'locale'>,
        },
      ],
    });
  });

  it('shows validation copy when submit with empty fields', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('.login-form'));
    form.triggerEventHandler('submit', { preventDefault: vi.fn() });

    fixture.detectChanges();
    const err = fixture.debugElement.query(By.css('[data-testid="login-error"]'));
    expect(err).toBeTruthy();
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('calls login and navigateAfterLogin on successful submit', () => {
    authMock.login.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const [userHost, passHost] = fixture.debugElement.queryAll(By.css('app-ui-input'));
    userHost.triggerEventHandler('valueChange', 'alice');
    passHost.triggerEventHandler('valueChange', 'secret');
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('.login-form'));
    form.triggerEventHandler('submit', { preventDefault: vi.fn() });
    fixture.detectChanges();

    expect(authMock.login).toHaveBeenCalledWith('alice', 'secret');
    expect(authMock.navigateAfterLogin).toHaveBeenCalled();
  });

  it('shows error when login fails', () => {
    authMock.login.mockReturnValue(throwError(() => new Error('unauthorized')));
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const [userHost, passHost] = fixture.debugElement.queryAll(By.css('app-ui-input'));
    userHost.triggerEventHandler('valueChange', 'alice');
    passHost.triggerEventHandler('valueChange', 'bad');
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('.login-form'));
    form.triggerEventHandler('submit', { preventDefault: vi.fn() });
    fixture.detectChanges();

    expect(authMock.navigateAfterLogin).not.toHaveBeenCalled();
    const err = fixture.debugElement.query(By.css('[data-testid="login-error"]'));
    expect(err).toBeTruthy();
  });
});
