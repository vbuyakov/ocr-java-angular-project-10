import type { AppSettings } from '@app/core/config/app-settings';

/** Builds the SockJS URL used by {@link ChatStompService}, including the JWT query param. */
export function buildSockJsUrl(settings: AppSettings, token: string): string {
  const base = resolveSockJsBaseUrl(settings);
  const q = new URLSearchParams({ access_token: token });
  return `${base}/ws?${q.toString()}`;
}

export function resolveSockJsBaseUrl(settings: AppSettings): string {
  const trimmed = settings.wsUrl.trim();
  if (trimmed.length > 0) {
    return trimmed.replace(/\/$/, '');
  }
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    return (globalThis as Window & typeof globalThis).location.origin;
  }
  return '';
}
