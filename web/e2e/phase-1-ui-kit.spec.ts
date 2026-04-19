import { expect, test } from '@playwright/test';

test.describe('Phase 1 — UI kit', () => {
  test('dev page shows primitives and mobile layout', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/dev/ui');

    await expect(page.getByTestId('dev-ui-kit')).toBeVisible();
    await expect(page.getByTestId('demo-primary-button')).toBeVisible();
    await expect(page.getByTestId('demo-secondary-button')).toBeVisible();
    await expect(page.getByTestId('demo-outline-button')).toBeVisible();
    await expect(page.getByTestId('demo-input')).toBeVisible();
    await expect(page.getByTestId('demo-card')).toBeVisible();
    await expect(page.getByTestId('demo-alert-info')).toBeVisible();
    await expect(page.getByTestId('demo-tabs')).toBeVisible();
    await expect(page.getByTestId('demo-modal-open')).toBeVisible();
    await expect(page.getByTestId('demo-confirm-modal-open')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('demo-primary-button')).toBeVisible();

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('modal opens and closes', async ({ page }) => {
    await page.goto('/dev/ui');
    await page.getByTestId('demo-modal-open').click();
    await expect(page.getByTestId('demo-modal')).toBeVisible();
    await page.getByTestId('demo-modal-close').click();
    await expect(page.getByTestId('demo-modal')).toHaveCount(0);
  });

  test('confirm modal closes on confirm', async ({ page }) => {
    await page.goto('/dev/ui');
    await page.getByTestId('demo-confirm-modal-open').click();
    await expect(page.getByTestId('demo-confirm-modal')).toBeVisible();
    await page.getByTestId('demo-confirm-modal-confirm').click();
    await expect(page.getByTestId('demo-confirm-modal')).toHaveCount(0);
  });

  test('confirm modal closes on cancel', async ({ page }) => {
    await page.goto('/dev/ui');
    await page.getByTestId('demo-confirm-modal-open').click();
    await expect(page.getByTestId('demo-confirm-modal')).toBeVisible();
    await page.getByTestId('demo-confirm-modal-cancel').click();
    await expect(page.getByTestId('demo-confirm-modal')).toHaveCount(0);
  });
});
