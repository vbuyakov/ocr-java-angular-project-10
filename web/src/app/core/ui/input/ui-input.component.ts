import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

let nextInputId = 0;

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiInputComponent {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly inputType = input<HTMLInputElement['type']>('text');
  readonly autocomplete = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly testId = input<string>('ui-input');

  readonly value = model<string>('');

  protected readonly controlId = signal(`ui-input-${++nextInputId}`);
}
