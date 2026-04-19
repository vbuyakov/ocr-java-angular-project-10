import { InjectionToken } from '@angular/core';

import type { AppLocale } from '@app/core/i18n/app-locale';
import { environment } from '@environments/environment';

/** Runtime URLs for REST and SockJS/STOMP (same origin as API in dev). */
export interface AppSettings {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly wsUrl: string;
  readonly maxChatMessageChars: number;
  /** Default language when `localStorage` has no `ycyw.locale` (`en` | `fr`). */
  readonly defaultLocale: AppLocale;
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS');

export function appSettingsFactory(): AppSettings {
  return {
    production: environment.production,
    apiBaseUrl: environment.apiBaseUrl,
    wsUrl: environment.wsUrl,
    maxChatMessageChars: environment.maxChatMessageChars,
    defaultLocale: environment.defaultLocale,
  };
}
