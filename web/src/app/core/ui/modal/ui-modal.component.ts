import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [UiButtonComponent],
  templateUrl: './ui-modal.component.html',
  styleUrl: './ui-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiModalComponent {
  readonly open = model<boolean>(false);
  readonly title = input<string>('');
  /** `data-testid` on the dialog panel (not the backdrop). */
  readonly testId = input<string>('ui-modal');

  readonly closed = output<void>();

  protected onBackdropClick(): void {
    this.close();
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
