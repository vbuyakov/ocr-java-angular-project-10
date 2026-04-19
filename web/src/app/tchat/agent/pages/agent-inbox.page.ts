import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ChatStompService } from '@app/core/websocket/chat-stomp.service';
import type { AgentChatBucket } from '@app/tchat/models/agent-chat.models';
import type { ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';
import { parseChatListUpdatedPayload } from '@app/tchat/models/ws-events';
import { formatChatListLine } from '@app/tchat/util/chat-list-label';

import { AgentChatApiService } from '../services/agent-chat.api.service';

const INBOX_BUCKETS: AgentChatBucket[] = ['NEW_REQUESTS', 'MY_ACTIVE', 'OTHERS_ACTIVE'];

@Component({
  selector: 'app-agent-inbox-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agent-inbox.page.html',
  styleUrl: './agent-inbox.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentInboxPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly documentRef = inject(DOCUMENT);
  private readonly api = inject(AgentChatApiService);
  protected readonly stomp = inject(ChatStompService);

  private listSub: Subscription | undefined;
  private countsSub: Subscription | undefined;

  protected readonly buckets = INBOX_BUCKETS;
  protected readonly bucket = signal<AgentChatBucket>('NEW_REQUESTS');
  protected readonly items = signal<ChatSummaryResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly inboxCountsLoaded = signal(false);
  protected readonly newRequestsCount = signal(0);
  protected readonly myActiveCount = signal(0);

  protected readonly chatListLine = formatChatListLine;

  private unsubChats: (() => void) | undefined;

  private readonly onVisibilityChange = (): void => {
    if (this.documentRef.visibilityState !== 'visible') {
      return;
    }
    this.fetchBucketCounts();
    this.fetchList();
  };

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.unsubChats?.();
      this.listSub?.unsubscribe();
      this.countsSub?.unsubscribe();
      this.documentRef.removeEventListener('visibilitychange', this.onVisibilityChange);
    });
  }

  ngOnInit(): void {
    this.documentRef.addEventListener('visibilitychange', this.onVisibilityChange);
    this.stomp.connect();
    this.unsubChats = this.stomp.subscribe('/user/queue/chats', (m) => {
      if (parseChatListUpdatedPayload(m.body)) {
        this.fetchList();
        this.fetchBucketCounts();
      }
    });
    this.fetchList();
    this.fetchBucketCounts();
  }

  protected selectBucket(b: AgentChatBucket): void {
    this.bucket.set(b);
    this.fetchList();
    this.fetchBucketCounts();
  }

  protected rowLinkable(): boolean {
    return this.bucket() !== 'OTHERS_ACTIVE';
  }

  /** Positive count for tab badge, or `null` when hidden (not loaded, wrong tab, or zero). */
  protected bucketBadgeCount(b: AgentChatBucket): number | null {
    if (!this.inboxCountsLoaded()) {
      return null;
    }
    if (b === 'NEW_REQUESTS') {
      const n = this.newRequestsCount();
      return n > 0 ? n : null;
    }
    if (b === 'MY_ACTIVE') {
      const n = this.myActiveCount();
      return n > 0 ? n : null;
    }
    return null;
  }

  private fetchList(): void {
    this.listSub?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.listSub = this.api.listChats(this.bucket()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Failed to load inbox');
      },
    });
  }

  private fetchBucketCounts(): void {
    this.countsSub?.unsubscribe();
    this.countsSub = this.api.getInboxBucketCounts().subscribe({
      next: (c) => {
        this.newRequestsCount.set(Number(c.newRequests));
        this.myActiveCount.set(Number(c.myActive));
        this.inboxCountsLoaded.set(true);
      },
      error: () => {
        /* keep last counts; avoid flashing zeros */
      },
    });
  }
}
