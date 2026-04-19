import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_SETTINGS, type AppSettings } from '@app/core/config/app-settings';

import { I18nService } from './i18n.service';

function mockDocument() {
  const store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
  };
  const documentElement = { setAttribute: vi.fn() };
  return {
    ls,
    document: {
      defaultView: { localStorage: ls } as unknown as Window,
      documentElement,
    },
  };
}

describe('I18nService', () => {
  const appSettings: AppSettings = {
    production: false,
    apiBaseUrl: '',
    wsUrl: '',
    maxChatMessageChars: 1,
    defaultLocale: 'en',
  };

  let httpMock: HttpTestingController;

  beforeEach(() => {
    const { document: doc } = mockDocument();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        I18nService,
        { provide: APP_SETTINGS, useValue: appSettings },
        { provide: DOCUMENT, useValue: doc },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('loadInitialLocale respects localStorage locale', async () => {
    const { document: doc, ls } = mockDocument();
    ls.setItem('ycyw.locale', 'fr');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        I18nService,
        { provide: APP_SETTINGS, useValue: appSettings },
        { provide: DOCUMENT, useValue: doc },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const i18n = TestBed.inject(I18nService);
    const p = i18n.loadInitialLocale();
    httpMock.expectOne('/i18n/fr.json').flush({ lang: 'FR' });
    await p;
    expect(i18n.locale()).toBe('fr');
    expect(i18n.translate('lang')).toBe('FR');
  });

  it('loadInitialLocale fetches default bundle and translates with params', async () => {
    const i18n = TestBed.inject(I18nService);
    const done = i18n.loadInitialLocale();
    httpMock.expectOne('/i18n/en.json').flush({ greet: 'Hi {{name}}' });
    await done;
    expect(i18n.locale()).toBe('en');
    expect(i18n.translate('greet', { name: 'Bo' })).toBe('Hi Bo');
  });

  it('translate falls back to key when missing', async () => {
    const i18n = TestBed.inject(I18nService);
    const p = i18n.loadInitialLocale();
    httpMock.expectOne('/i18n/en.json').flush({});
    await p;
    expect(i18n.translate('missing.key')).toBe('missing.key');
  });

  it('setLocale stores id and loads fr bundle', async () => {
    const i18n = TestBed.inject(I18nService);
    const p0 = i18n.loadInitialLocale();
    httpMock.expectOne('/i18n/en.json').flush({});
    await p0;

    const p1 = i18n.setLocale('fr');
    httpMock.expectOne('/i18n/fr.json').flush({ a: 'b' });
    await p1;

    expect(i18n.locale()).toBe('fr');
    expect(i18n.translate('a')).toBe('b');
  });
});
