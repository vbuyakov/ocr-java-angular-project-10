import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ChatStompService } from '@app/core/websocket/chat-stomp.service';
import type { ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';
import { formatChatListLine } from '@app/tchat/util/chat-list-label';

import { AgentChatApiService } from '../services/agent-chat.api.service';

@Component({
  selector: 'app-agent-archived-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agent-archived.page.html',
  styleUrl: './agent-archived.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentArchivedPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(AgentChatApiService);
  protected readonly stomp = inject(ChatStompService);

  protected readonly items = signal<ChatSummaryResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly chatListLine = formatChatListLine;

  private listSub: Subscription | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.listSub?.unsubscribe());
  }

  ngOnInit(): void {
    this.stomp.connect();
    this.fetchList();
  }

  private fetchList(): void {
    this.listSub?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.listSub = this.api.listChats('ARCHIVED').subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Failed to load archived chats');
      },
    });
  }
}
