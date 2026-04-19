import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

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

async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

test.describe('Phase 3 — post-login routes', () => {
  test('agent inbox loads when API is up', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    const username = process.env['E2E_AGENT_USERNAME'] ?? 'e2e-agent';
    const password = process.env['E2E_AGENT_PASSWORD'] ?? 'Test123!';

    await login(page, username, password);
    await expect(page).toHaveURL(/\/agent$/);
    await expect(page.getByTestId('agent-inbox-heading')).toBeVisible({ timeout: 20_000 });
  });

  test('support chat loads when API is up', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    const username = process.env['E2E_CLIENT_USERNAME'] ?? 'e2e-client';
    const password = process.env['E2E_CLIENT_PASSWORD'] ?? 'Test123!';

    await login(page, username, password);
    await expect(page).toHaveURL(/\/support\/chat$/);
    await expect(page.getByTestId('support-chat-heading')).toBeVisible({ timeout: 20_000 });
  });
});
