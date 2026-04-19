import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { I18nService } from '@app/core/i18n/i18n.service';

import { DevUiPageComponent } from './dev-ui.page';

const I18N_KEYS: Record<string, string> = {
  'devUi.title': 'Kit',
  'devUi.lead': 'Lead',
  'devUi.buttons': 'Buttons',
  'devUi.textField': 'Field',
  'devUi.card': 'Card',
  'devUi.cardTitle': 'Card title',
  'devUi.cardBody': 'Card body',
  'devUi.alerts': 'Alerts',
  'devUi.tabs': 'Tabs',
  'devUi.tabA': 'Tab A',
  'devUi.tabB': 'Tab B',
  'devUi.tabPanelA': 'Panel A',
  'devUi.tabPanelB': 'Panel B',
  'devUi.modal': 'Modal',
  'devUi.openModal': 'Open',
  'devUi.openConfirm': 'Open confirm',
  'devUi.exampleTitle': 'Example',
  'devUi.modalBody': 'Modal text',
  'devUi.confirmTitle': 'Confirm',
  'devUi.confirmBody': 'Confirm text',
  'common.primary': 'Primary',
  'common.secondary': 'Secondary',
  'common.outline': 'Outline',
  'common.label': 'Label',
  'common.placeholder': 'Placeholder',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.continue': 'Continue',
  'devUi.alertInfo': 'Info',
  'devUi.alertSuccess': 'OK',
  'devUi.alertWarning': 'Warn',
  'devUi.alertDanger': 'Danger',
};

describe('DevUiPageComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DevUiPageComponent],
      providers: [
        {
          provide: I18nService,
          useValue: {
            i18nVersion: signal(0),
            locale: signal('en'),
            translate: (k: string) => I18N_KEYS[k] ?? k,
          } satisfies Pick<I18nService, 'translate' | 'i18nVersion' | 'locale'>,
        },
      ],
    });
  });

  it('renders the UI kit shell', () => {
    const fixture = TestBed.createComponent(DevUiPageComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dev-ui-kit"]'))).toBeTruthy();
  });

  it('switches the tab panel when tab B is selected', () => {
    const fixture = TestBed.createComponent(DevUiPageComponent);
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('[data-testid="demo-tab-panel"]'));
    expect(panel.nativeElement.textContent?.trim()).toContain('Panel A');

    fixture.debugElement.query(By.css('[data-testid="demo-tabs-tab-b"]')).nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="demo-tab-panel"]')).nativeElement.textContent?.trim()).toContain(
      'Panel B',
    );
  });

  it('opens the standard and confirm modals from the demo actions', () => {
    const fixture = TestBed.createComponent(DevUiPageComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="demo-modal"]'))).toBeNull();

    fixture.debugElement.query(By.css('[data-testid="demo-modal-open"]')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="demo-modal"]'))).toBeTruthy();

    fixture.debugElement.query(By.css('[data-testid="demo-confirm-modal-open"]')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="demo-confirm-modal"]'))).toBeTruthy();
  });
});
