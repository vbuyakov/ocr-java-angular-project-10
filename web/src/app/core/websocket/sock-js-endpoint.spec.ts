import { describe, expect, it, vi } from 'vitest';

import type { AppSettings } from '@app/core/config/app-settings';

import { buildSockJsUrl, resolveSockJsBaseUrl } from './sock-js-endpoint';

const baseSettings = (): AppSettings => ({
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: '',
  maxChatMessageChars: 2000,
  defaultLocale: 'en',
});

describe('resolveSockJsBaseUrl', () => {
  it('uses wsUrl when set', () => {
    const s = { ...baseSettings(), wsUrl: 'https://ws.example/ws/' };
    expect(resolveSockJsBaseUrl(s)).toBe('https://ws.example/ws');
  });

  it('falls back to window.location.origin when wsUrl empty', () => {
    vi.stubGlobal('location', { origin: 'http://127.0.0.1:4200' });
    try {
      expect(resolveSockJsBaseUrl(baseSettings())).toBe('http://127.0.0.1:4200');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('buildSockJsUrl', () => {
  it('appends /ws and access_token query', () => {
    const s = { ...baseSettings(), wsUrl: 'http://api/ws' };
    expect(buildSockJsUrl(s, 'abc.def')).toBe('http://api/ws/ws?access_token=abc.def');
  });
});
