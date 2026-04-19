import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@app/auth/auth.service';

/** Redirect authenticated users away from login (and similar guest-only routes). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return true;
  }
  if (auth.role() === 'CLIENT') {
    return router.createUrlTree(['/support/chat']);
  }
  if (auth.role() === 'AGENT') {
    return router.createUrlTree(['/agent']);
  }
  return router.createUrlTree(['/login']);
};
