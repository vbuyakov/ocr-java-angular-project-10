import { expect, test, type APIRequestContext } from '@playwright/test';

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

test.describe('Phase 2 — auth', () => {
  test('redirects guest from protected client route to login', async ({ page }) => {
    await page.goto('/support/chat');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('redirects guest from protected agent route to login', async ({ page }) => {
    await page.goto('/agent');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in as client and reaches support chat when API is available', async ({
    page,
    request,
  }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    const username = process.env['E2E_CLIENT_USERNAME'] ?? 'e2e-client';
    const password = process.env['E2E_CLIENT_PASSWORD'] ?? 'Test123!';

    await page.goto('/login');
    await page.getByTestId('login-username').fill(username);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/support\/chat$/);
    await expect(page.getByTestId('support-chat-heading')).toBeVisible();
    await expect(page.getByTestId('nav-username')).toContainText(username);
  });

  test('logs in as agent and reaches inbox when API is available', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    const username = process.env['E2E_AGENT_USERNAME'] ?? 'e2e-agent';
    const password = process.env['E2E_AGENT_PASSWORD'] ?? 'Test123!';

    await page.goto('/login');
    await page.getByTestId('login-username').fill(username);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/agent$/);
    await expect(page.getByTestId('agent-inbox-heading')).toBeVisible();
  });

  test('shows error on invalid credentials when API is available', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    await page.goto('/login');
    await page.getByTestId('login-username').fill('__invalid_user__');
    await page.getByTestId('login-password').fill('wrong');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });
});
