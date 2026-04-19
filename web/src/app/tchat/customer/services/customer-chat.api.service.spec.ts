import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { APP_SETTINGS, type AppSettings } from '@app/core/config/app-settings';

import { CustomerChatApiService } from './customer-chat.api.service';

describe('CustomerChatApiService', () => {
  const settings: AppSettings = {
    production: false,
    apiBaseUrl: 'http://api.test',
    wsUrl: '',
    maxChatMessageChars: 1,
    defaultLocale: 'en',
  };

  let httpMock: HttpTestingController;
  let service: CustomerChatApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomerChatApiService,
        { provide: APP_SETTINGS, useValue: settings },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CustomerChatApiService);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('getActiveChat returns null on 404', () => {
    let v: unknown;
    service.getActiveChat().subscribe((x) => (v = x));
    httpMock.expectOne('http://api.test/api/chat/active').flush('', { status: 404, statusText: 'N' });
    expect(v).toBeNull();
  });

  it('getActiveChat propagates other errors', () => {
    let err: unknown;
    service.getActiveChat().subscribe({ error: (e) => (err = e) });
    httpMock.expectOne('http://api.test/api/chat/active').flush('', { status: 500, statusText: 'E' });
    expect(err).toBeDefined();
  });

  it('createActiveChat errors when 409 and active chat still missing', () => {
    let sawError = false;
    service.createActiveChat('x').subscribe({ error: () => (sawError = true) });
    httpMock
      .expectOne({ method: 'POST', url: 'http://api.test/api/chat/active' })
      .flush(null, { status: 409, statusText: 'Conflict' });
    httpMock.expectOne('http://api.test/api/chat/active').flush('', { status: 404, statusText: 'N' });
    expect(sawError).toBe(true);
  });

  it('createActiveChat trims message and retries on 409', () => {
    const out: unknown[] = [];
    service.createActiveChat('  hello  ').subscribe({ next: (x) => out.push(x) });
    const post = httpMock.expectOne({ method: 'POST', url: 'http://api.test/api/chat/active' });
    expect(post.request.body).toEqual({ initialMessage: 'hello' });
    post.flush(null, { status: 409, statusText: 'Conflict' });

    const get = httpMock.expectOne('http://api.test/api/chat/active');
    get.flush({ chatId: 'c1', status: 'ACTIVE' });

    expect(out).toEqual([{ chatId: 'c1', status: 'ACTIVE' }]);
  });

  it('listArchived passes pagination query params', () => {
    service.listArchived(2, 15).subscribe();
    const r = httpMock.expectOne(
      (req) => req.url === 'http://api.test/api/chat/archived' && req.params.get('page') === '2',
    );
    expect(r.request.params.get('size')).toBe('15');
    r.flush({ items: [], hasMore: false, nextCursor: null });
  });

  it('getMessages encodes chat id', () => {
    service.getMessages('a/b', 10).subscribe();
    const r = httpMock.expectOne(
      (req) =>
        req.url.startsWith('http://api.test/api/chat/a%2Fb/messages') && req.params.get('limit') === '10',
    );
    expect(r.request.params.get('limit')).toBe('10');
    r.flush({ messages: [], hasMore: false, clientUsername: null, chatCreatedAt: null });
  });
});
