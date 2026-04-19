import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { APP_SETTINGS } from '@app/core/config/app-settings';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';
import type { AgentChatBucket } from '@app/tchat/models/agent-chat.models';
import type { ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';
import { parseChatListUpdatedPayload } from '@app/tchat/models/ws-events';

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
  private readonly settings = inject(APP_SETTINGS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(AgentChatApiService);
  protected readonly stomp = inject(ChatStompService);

  private listSub: Subscription | undefined;

  protected readonly showStompDebug = computed(() => !this.settings.production);
  protected readonly buckets = INBOX_BUCKETS;
  protected readonly bucket = signal<AgentChatBucket>('NEW_REQUESTS');
  protected readonly items = signal<ChatSummaryResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private unsubChats: (() => void) | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.unsubChats?.();
      this.listSub?.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.stomp.connect();
    this.unsubChats = this.stomp.subscribe('/user/queue/chats', (m) => {
      if (parseChatListUpdatedPayload(m.body)) {
        this.fetchList();
      }
    });
    this.fetchList();
  }

  protected selectBucket(b: AgentChatBucket): void {
    this.bucket.set(b);
    this.fetchList();
  }

  protected rowLinkable(): boolean {
    return this.bucket() !== 'OTHERS_ACTIVE';
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
}
