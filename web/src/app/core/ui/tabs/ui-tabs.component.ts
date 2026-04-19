import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
} from '@angular/core';

export interface UiTabItem {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-ui-tabs',
  standalone: true,
  templateUrl: './ui-tabs.component.html',
  styleUrl: './ui-tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiTabsComponent {
  readonly tabs = input.required<readonly UiTabItem[]>();
  readonly selectedId = model<string>('');
  readonly testId = input<string>('ui-tabs');

  constructor() {
    effect(() => {
      const list = this.tabs();
      const current = this.selectedId();
      if (list.length === 0) {
        return;
      }
      const valid = list.some((t) => t.id === current);
      if (!valid) {
        const first = list[0];
        if (first) {
          this.selectedId.set(first.id);
        }
      }
    });
  }

  protected selectTab(id: string): void {
    this.selectedId.set(id);
  }
}
