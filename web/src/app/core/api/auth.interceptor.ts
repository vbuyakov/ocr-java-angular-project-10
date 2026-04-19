import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthTokenStore } from '@app/auth/auth-token.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthTokenStore);
  const token = store.accessToken();
  if (token !== null && !req.headers.has('Authorization')) {
    return next(
      req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      }),
    );
  }
  return next(req);
};
