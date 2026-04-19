import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { APP_SETTINGS } from '@app/core/config/app-settings';

import { type AppLocale, isAppLocale } from './app-locale';

const STORAGE_KEY = 'ycyw.locale';

function lookup(messages: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly documentRef = inject(DOCUMENT);
  private readonly settings = inject(APP_SETTINGS);

  private readonly messages = signal<Record<string, unknown>>({});
  readonly locale = signal<AppLocale>('fr');
  /** Bumped when the JSON bundle is replaced so pipes re-render. */
  readonly i18nVersion = signal(0);

  /** Loads `defaultLocale` from config (or `localStorage` override) before first render. */
  async loadInitialLocale(): Promise<void> {
    const initial = this.resolveInitialLocale();
    await this.loadLocale(initial);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    let s = lookup(this.messages(), key) ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return s;
  }

  async setLocale(id: AppLocale): Promise<void> {
    this.documentRef.defaultView?.localStorage.setItem(STORAGE_KEY, id);
    await this.loadLocale(id);
  }

  private resolveInitialLocale(): AppLocale {
    const stored = this.documentRef.defaultView?.localStorage.getItem(STORAGE_KEY);
    if (stored && isAppLocale(stored)) {
      return stored;
    }
    const def = this.settings.defaultLocale;
    return isAppLocale(def) ? def : 'fr';
  }

  private async loadLocale(id: AppLocale): Promise<void> {
    const data = await firstValueFrom(this.http.get<Record<string, unknown>>(`/i18n/${id}.json`));
    this.messages.set(data);
    this.locale.set(id);
    this.i18nVersion.update((v) => v + 1);
    this.documentRef.documentElement.setAttribute('lang', id);
  }
}
