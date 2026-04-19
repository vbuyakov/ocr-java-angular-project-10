import { Pipe, PipeTransform, inject } from '@angular/core';

import { I18nService } from './i18n.service';

/** Template translations; `pure: false` so text updates when locale or bundle changes. */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    this.i18n.i18nVersion();
    this.i18n.locale();
    return this.i18n.translate(key, params);
  }
}
