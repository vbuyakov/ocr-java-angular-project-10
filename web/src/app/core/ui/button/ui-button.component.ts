import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type UiButtonVariant = 'primary' | 'secondary' | 'outline';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButtonComponent {
  readonly variant = input<UiButtonVariant>('primary');
  readonly disabled = input(false);
  readonly type = input<HTMLButtonElement['type']>('button');
  /** Smaller padding and text (toolbar / secondary actions). */
  readonly compact = input(false);
  /** Optional `data-testid` for tests; defaults to `ui-button`. */
  readonly testId = input<string>('ui-button');

  readonly clicked = output<void>();

  protected readonly buttonClass = computed(() => {
    const v = this.variant();
    let base: string;
    if (v === 'primary') {
      base = 'btn-primary';
    } else if (v === 'secondary') {
      base = 'btn-secondary';
    } else {
      base = 'btn-outline';
    }
    return this.compact() ? `${base} btn-compact` : base;
  });

  protected onClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
