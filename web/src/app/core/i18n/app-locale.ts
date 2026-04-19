export type AppLocale = 'en' | 'fr';

export const APP_LOCALES: readonly AppLocale[] = ['en', 'fr'];

export function isAppLocale(value: string): value is AppLocale {
  return value === 'en' || value === 'fr';
}
