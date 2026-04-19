import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { APP_SETTINGS, type AppSettings } from '@app/core/config/app-settings';

import { AgentChatApiService } from './agent-chat.api.service';

describe('AgentChatApiService', () => {
  const settings: AppSettings = {
    production: false,
    apiBaseUrl: 'http://api.test',
    wsUrl: '',
    maxChatMessageChars: 1,
    defaultLocale: 'en',
  };

  let httpMock: HttpTestingController;
  let service: AgentChatApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgentChatApiService,
        { provide: APP_SETTINGS, useValue: settings },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AgentChatApiService);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('listChats sends bucket and paging params', () => {
    service.listChats('NEW_REQUESTS', 1, 25).subscribe();
    const r = httpMock.expectOne(
      (req) => req.url.startsWith('http://api.test/api/agent/chats') && req.params.get('bucket') === 'NEW_REQUESTS',
    );
    expect(r.request.params.get('bucket')).toBe('NEW_REQUESTS');
    expect(r.request.params.get('page')).toBe('1');
    expect(r.request.params.get('size')).toBe('25');
    r.flush({ items: [], hasMore: false, nextCursor: null });
  });

  it('getChatSummary encodes id', () => {
    service.getChatSummary('x y').subscribe();
    httpMock.expectOne('http://api.test/api/agent/chats/x%20y').flush({
      chatId: 'x y',
      status: 'ACTIVE',
      clientId: 'c',
      agentId: null,
      createdAt: 't',
      updatedAt: 't',
    });
  });

  it('getInboxBucketCounts hits counts endpoint', () => {
    service.getInboxBucketCounts().subscribe();
    httpMock.expectOne('http://api.test/api/agent/chats/bucket-counts').flush({
      newRequests: 1,
      myActive: 2,
    });
  });

  it('getMessages uses shared messages path with limit', () => {
    service.getMessages('cid', 5).subscribe();
    const r = httpMock.expectOne(
      (req) =>
        req.url.startsWith('http://api.test/api/chat/cid/messages') && req.params.get('limit') === '5',
    );
    r.flush({ messages: [], hasMore: false, clientUsername: null, chatCreatedAt: null });
  });
});
