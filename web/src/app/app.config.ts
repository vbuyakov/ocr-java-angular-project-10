import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from '@app/app.routes';
import { authInterceptor } from '@app/core/api/auth.interceptor';
import { APP_SETTINGS, appSettingsFactory } from '@app/core/config/app-settings';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    { provide: APP_SETTINGS, useFactory: appSettingsFactory },
  ],
};
