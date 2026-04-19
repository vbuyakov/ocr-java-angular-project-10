import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { I18nService } from './i18n.service';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  it('uses I18nService.translate and reads version signals', () => {
    TestBed.configureTestingModule({
      providers: [
        TranslatePipe,
        {
          provide: I18nService,
          useValue: {
            i18nVersion: signal(0),
            locale: signal('en'),
            translate: (key: string, params?: Record<string, string | number>) =>
              params ? `${key}:${params['n']}` : `_${key}`,
          },
        },
      ],
    });
    const pipe = TestBed.inject(TranslatePipe);
    expect(pipe.transform('k')).toBe('_k');
    expect(pipe.transform('k', { n: 1 })).toBe('k:1');
  });
});
