import { expect, test } from './fixtures';

test.describe('Phase 0 — shell', () => {
  test('shows logo and header without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');

    await expect(page.getByTestId('app-logo')).toBeVisible();
    await expect(page.getByTestId('app-header')).toBeVisible();
    await expect(page.getByTestId('login-phase-hint')).toBeVisible();

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
