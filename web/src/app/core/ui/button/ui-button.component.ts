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
  /** Optional `data-testid` for tests; defaults to `ui-button`. */
  readonly testId = input<string>('ui-button');

  readonly clicked = output<void>();

  protected readonly buttonClass = computed(() => {
    const v = this.variant();
    if (v === 'primary') {
      return 'btn-primary';
    }
    if (v === 'secondary') {
      return 'btn-secondary';
    }
    return 'btn-outline';
  });

  protected onClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
