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

test.describe('Phase 5 — agent workbench', () => {
  test('agent inbox and archived routes load', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    const username = process.env['E2E_AGENT_USERNAME'] ?? 'e2e-agent';
    const password = process.env['E2E_AGENT_PASSWORD'] ?? 'Test123!';

    await page.goto('/login');
    await page.getByTestId('login-username').fill(username);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('agent-inbox-heading')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('agent-bucket-tabs')).toBeVisible();

    await page.getByTestId('nav-agent-archived').click();
    await expect(page.getByTestId('agent-archived-heading')).toBeVisible();
  });
});
