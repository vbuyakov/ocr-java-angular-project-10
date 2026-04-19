import { describe, expect, it } from 'vitest';

import { APP_LOCALES, isAppLocale } from './app-locale';

describe('app-locale', () => {
  it('isAppLocale narrows en and fr', () => {
    expect(isAppLocale('en')).toBe(true);
    expect(isAppLocale('fr')).toBe(true);
    expect(isAppLocale('de')).toBe(false);
  });

  it('APP_LOCALES lists supported ids', () => {
    expect(APP_LOCALES).toEqual(['en', 'fr']);
  });
});
