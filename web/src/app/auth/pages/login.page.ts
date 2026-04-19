import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthService } from '@app/auth/auth.service';
import { I18nService } from '@app/core/i18n/i18n.service';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';
import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';
import { UiInputComponent } from '@app/core/ui/input/ui-input.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [UiAlertComponent, UiButtonComponent, UiInputComponent, TranslatePipe],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected onUsername(value: string): void {
    this.username.set(value);
  }

  protected onPassword(value: string): void {
    this.password.set(value);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const u = this.username();
    const p = this.password();
    if (!u || !p) {
      this.errorMessage.set(this.i18n.translate('login.errorRequired'));
      return;
    }
    this.submitting.set(true);
    this.auth.login(u, p).subscribe({
      next: () => {
        this.submitting.set(false);
        this.auth.navigateAfterLogin();
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(this.i18n.translate('login.errorFailed'));
      },
    });
  }
}
