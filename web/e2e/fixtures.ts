import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

/** E2E runs with English copy so assertions stay stable while the app defaults to French. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('ycyw.locale', 'en');
    });
    await use(page);
  },
});
