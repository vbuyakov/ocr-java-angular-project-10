import type { APIRequestContext, Page } from '@playwright/test';

import { expect } from '../fixtures';

export async function isApiReachable(request: APIRequestContext): Promise<boolean> {
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

export async function loginAsClient(page: Page): Promise<void> {
  const username = process.env['E2E_CLIENT_USERNAME'] ?? 'e2e-client';
  const password = process.env['E2E_CLIENT_PASSWORD'] ?? 'Test123!';
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/support\/chat$/);
}

export async function loginAsAgent(page: Page): Promise<void> {
  const username = process.env['E2E_AGENT_USERNAME'] ?? 'e2e-agent';
  const password = process.env['E2E_AGENT_PASSWORD'] ?? 'Test123!';
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/agent$/);
}
