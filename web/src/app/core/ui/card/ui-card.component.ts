import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  templateUrl: './ui-card.component.html',
  styleUrl: './ui-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCardComponent {
  readonly title = input<string>('');
  readonly testId = input<string>('ui-card');
}
