import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from '@app/app.routes';
import { authInterceptor } from '@app/core/api/auth.interceptor';
import { APP_SETTINGS, appSettingsFactory } from '@app/core/config/app-settings';
import { I18nService } from '@app/core/i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    { provide: APP_SETTINGS, useFactory: appSettingsFactory },
    provideAppInitializer(() => {
      const i18n = inject(I18nService);
      return i18n.loadInitialLocale();
    }),
  ],
};
