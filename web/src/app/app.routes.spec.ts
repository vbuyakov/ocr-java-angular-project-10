import type { Routes } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';

async function collectLoadComponents(rs: Routes): Promise<(() => Promise<unknown>)[]> {
  const out: (() => Promise<unknown>)[] = [];
  for (const r of rs) {
    if (typeof r.loadComponent === 'function') {
      out.push(r.loadComponent as () => Promise<unknown>);
    }
    if (r.children) {
      out.push(...(await collectLoadComponents(r.children)));
    }
  }
  return out;
}

describe('app.routes', () => {
  it('every loadComponent resolves to a defined export', async () => {
    const loaders = await collectLoadComponents(routes);
    expect(loaders.length).toBeGreaterThan(0);
    for (const load of loaders) {
      const mod = await load();
      expect(mod).toBeTruthy();
    }
  });
});
