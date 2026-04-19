import { InjectionToken } from '@angular/core';

import { environment } from '@environments/environment';

/** Runtime URLs for REST and SockJS/STOMP (same origin as API in dev). */
export interface AppSettings {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly wsUrl: string;
  readonly maxChatMessageChars: number;
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS');

export function appSettingsFactory(): AppSettings {
  return {
    production: environment.production,
    apiBaseUrl: environment.apiBaseUrl,
    wsUrl: environment.wsUrl,
    maxChatMessageChars: environment.maxChatMessageChars,
  };
}
