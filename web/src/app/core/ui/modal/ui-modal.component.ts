import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';

export type UiModalActionLayout = 'close' | 'confirm';

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
  /** `close` = single dismiss button; `confirm` = cancel + confirm (e.g. destructive prompts). */
  readonly actionLayout = input<UiModalActionLayout>('close');
  readonly closeLabel = input<string>('Close');
  readonly cancelLabel = input<string>('Cancel');
  readonly confirmLabel = input<string>('Confirm');
  /** `data-testid` on the dialog panel (not the backdrop). */
  readonly testId = input<string>('ui-modal');

  /** Fires whenever the dialog closes (after open becomes false). */
  readonly closed = output<void>();
  /** Confirm layout only: user chose the primary action. */
  readonly confirmed = output<void>();
  /** Confirm layout only: cancel, backdrop click, or other dismiss without confirming. */
  readonly dismissed = output<void>();

  protected onBackdropClick(): void {
    if (this.actionLayout() === 'confirm') {
      this.dismissed.emit();
    }
    this.shut();
  }

  protected onConfirmClick(): void {
    this.confirmed.emit();
    this.shut();
  }

  protected onCancelClick(): void {
    this.dismissed.emit();
    this.shut();
  }

  protected onCloseClick(): void {
    this.shut();
  }

  private shut(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
