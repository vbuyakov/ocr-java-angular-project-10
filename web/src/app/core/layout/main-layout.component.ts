import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '@app/auth/auth.service';
import { APP_SETTINGS } from '@app/core/config/app-settings';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly settings = inject(APP_SETTINGS);
  protected readonly auth = inject(AuthService);

  protected readonly showDevNav = computed(() => !this.settings.production);

  protected readonly brandLink = computed(() => {
    if (!this.auth.isAuthenticated()) {
      return '/login';
    }
    return this.auth.role() === 'CLIENT' ? '/support/chat' : '/agent';
  });
}
