import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './fixtures';
import { isApiReachable, loginAsAgent, loginAsClient } from './helpers/api';

test.describe('Production routes', () => {
  test('login shell: header, logo, hint, no console errors', async ({ page }) => {
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

  test('guest is sent to login from protected client route', async ({ page }) => {
    await page.goto('/support/chat');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('guest is sent to login from protected agent route', async ({ page }) => {
    await page.goto('/agent');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('invalid credentials show login error when API is up', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    await page.goto('/login');
    await page.getByTestId('login-username').fill('__invalid_user__');
    await page.getByTestId('login-password').fill('wrong');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('client: support chat and archived list when API is up', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    await loginAsClient(page);
    await expect(page.getByTestId('support-chat-heading')).toBeVisible();

    const thread = page.getByTestId('support-chat-thread');
    const start = page.getByTestId('chat-initial-message');
    await expect(thread.or(start)).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('nav-support-archived').click();
    await expect(page).toHaveURL(/\/support\/archived$/);
    await expect(page.getByTestId('archived-list-heading')).toBeVisible();
    const empty = page.getByTestId('archived-list-empty');
    const list = page.getByTestId('archived-list');
    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });
  });

  test('agent: inbox and archived when API is up', async ({ page, request }) => {
    if (!(await isApiReachable(request))) {
      test.skip();
    }

    await loginAsAgent(page);
    await expect(page.getByTestId('agent-inbox-heading')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('agent-bucket-tabs')).toBeVisible();

    await page.getByTestId('nav-agent-archived').click();
    await expect(page.getByTestId('agent-archived-heading')).toBeVisible();
  });
});

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

for (const vp of viewports) {
  test.describe(`A11y / layout (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('login has no critical or serious axe violations', async ({ page }) => {
      await page.goto('/login');
      const results = await new AxeBuilder({ page }).analyze();
      const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
    });

    test('header fits viewport width', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByTestId('app-header')).toBeVisible();
      const header = await page.getByTestId('app-header').boundingBox();
      expect(header).toBeTruthy();
      expect(header!.width).toBeLessThanOrEqual(vp.width);
    });
  });
}
