import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type UiAlertVariant = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-ui-alert',
  standalone: true,
  templateUrl: './ui-alert.component.html',
  styleUrl: './ui-alert.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAlertComponent {
  readonly variant = input<UiAlertVariant>('info');
  readonly message = input.required<string>();
  readonly testId = input<string>('ui-alert');

  protected readonly role = computed(() =>
    this.variant() === 'danger' || this.variant() === 'warning' ? 'alert' : 'status',
  );

  protected readonly alertClass = computed(() => {
    const v = this.variant();
    if (v === 'success') {
      return 'ui-alert ui-alert-success';
    }
    if (v === 'warning') {
      return 'ui-alert ui-alert-warning';
    }
    if (v === 'danger') {
      return 'ui-alert ui-alert-danger';
    }
    return 'ui-alert ui-alert-info';
  });
}
