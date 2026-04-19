import { type APIRequestContext, type Page } from '@playwright/test';

import { expect, test } from './fixtures';

async function isApiReachable(request: APIRequestContext): Promise<boolean> {
  try {
    const r = await request.post('http://127.0.0.1:8080/auth/login', {
      data: { login: '__nope__', password: '__nope__' },
      failOnStatusCode: false,
    });
    return r.status() === 401 || r.status() === 403 || r.status() === 400;
  } catch {
    return false;
  }
}

async function loginClient(page: Page): Promise<void> {
  const username = process.env['E2E_CLIENT_USERNAME'] ?? 'e2e-client';
  const password = process.env['E2E_CLIENT_PASSWORD'] ?? 'Test123!';
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/support\/chat$/);
}

test.describe('Phase 4 — customer chat', () => {
  test('client reaches support chat and sees thread or start flow when API is up', async ({
    page,
    request,
  }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    await loginClient(page);
    await expect(page.getByTestId('support-chat-heading')).toBeVisible();

    const thread = page.getByTestId('support-chat-thread');
    const start = page.getByTestId('chat-initial-message');
    await expect(thread.or(start)).toBeVisible({ timeout: 15_000 });
  });

  test('archived list route loads when API is up', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    await loginClient(page);
    await page.getByTestId('nav-support-archived').click();
    await expect(page).toHaveURL(/\/support\/archived$/);
    await expect(page.getByTestId('archived-list-heading')).toBeVisible();
    const empty = page.getByTestId('archived-list-empty');
    const list = page.getByTestId('archived-list');
    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });
  });
});
