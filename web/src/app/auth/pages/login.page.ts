import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';
import { UiInputComponent } from '@app/core/ui/input/ui-input.component';

import { AuthService } from '@app/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [UiAlertComponent, UiButtonComponent, UiInputComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);

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
      this.errorMessage.set('Enter username and password.');
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
        this.errorMessage.set('Sign-in failed. Check your credentials and that the API is running.');
      },
    });
  }
}
