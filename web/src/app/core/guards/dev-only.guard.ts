import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { APP_SETTINGS } from '@app/core/config/app-settings';

/** Allows route only when `production` is false (local / dev build). */
export const devOnlyGuard: CanActivateFn = () => {
  const settings = inject(APP_SETTINGS);
  const router = inject(Router);
  if (settings.production) {
    return router.createUrlTree(['/login']);
  }
  return true;
};
