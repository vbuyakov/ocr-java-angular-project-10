import { Routes } from '@angular/router';

import { agentRoleGuard } from '@app/auth/guards/agent-role.guard';
import { authGuard } from '@app/auth/guards/auth.guard';
import { clientRoleGuard } from '@app/auth/guards/client-role.guard';
import { guestGuard } from '@app/auth/guards/guest.guard';
import { devOnlyGuard } from '@app/core/guards/dev-only.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@app/core/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('@app/auth/pages/login.page').then((m) => m.LoginPageComponent),
      },
      {
        path: 'support/chat',
        canActivate: [authGuard, clientRoleGuard],
        loadComponent: () =>
          import('@app/tchat/customer/pages/support-chat.page').then((m) => m.SupportChatPageComponent),
      },
      {
        path: 'agent',
        canActivate: [authGuard, agentRoleGuard],
        loadComponent: () =>
          import('@app/tchat/agent/pages/agent-home.page').then((m) => m.AgentHomePageComponent),
      },
      {
        path: 'dev/ui',
        canActivate: [devOnlyGuard],
        loadComponent: () => import('@app/core/pages/dev-ui.page').then((m) => m.DevUiPageComponent),
      },
    ],
  },
];
