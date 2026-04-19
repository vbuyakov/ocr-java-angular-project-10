import { ChangeDetectionStrategy, Component } from '@angular/core';

import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';
import { UiCardComponent } from '@app/core/ui/card/ui-card.component';
import { UiInputComponent } from '@app/core/ui/input/ui-input.component';
import { UiModalComponent } from '@app/core/ui/modal/ui-modal.component';
import type { UiTabItem } from '@app/core/ui/tabs/ui-tabs.component';
import { UiTabsComponent } from '@app/core/ui/tabs/ui-tabs.component';

@Component({
  selector: 'app-dev-ui-page',
  standalone: true,
  imports: [
    UiAlertComponent,
    UiButtonComponent,
    UiCardComponent,
    UiInputComponent,
    UiModalComponent,
    UiTabsComponent,
  ],
  templateUrl: './dev-ui.page.html',
  styleUrl: './dev-ui.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevUiPageComponent {
  protected readonly demoTabs: readonly UiTabItem[] = [
    { id: 'a', label: 'Tab A' },
    { id: 'b', label: 'Tab B' },
  ];

  protected selectedTabId = 'a';
  protected demoInputValue = '';
  protected modalOpen = false;
  protected confirmModalOpen = false;
}
