import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '@app/core/i18n/i18n.service';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';
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
    TranslatePipe,
  ],
  templateUrl: './dev-ui.page.html',
  styleUrl: './dev-ui.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevUiPageComponent {
  private readonly i18n = inject(I18nService);

  protected readonly demoTabs = computed<UiTabItem[]>(() => {
    this.i18n.i18nVersion();
    this.i18n.locale();
    return [
      { id: 'a', label: this.i18n.translate('devUi.tabA') },
      { id: 'b', label: this.i18n.translate('devUi.tabB') },
    ];
  });

  protected selectedTabId = 'a';
  protected demoInputValue = '';
  protected modalOpen = false;
  protected confirmModalOpen = false;
}
