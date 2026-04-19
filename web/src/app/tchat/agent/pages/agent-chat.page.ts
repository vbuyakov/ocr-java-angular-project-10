import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';

import { AuthService } from '@app/auth/auth.service';
import { APP_SETTINGS } from '@app/core/config/app-settings';
import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';
import { debounceLeadingEdge } from '@app/core/util/debounce';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';
import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';
import { parseChatStompErrorPayload, parseChatTopicPayload } from '@app/tchat/models/ws-events';

import { AgentChatApiService } from '../services/agent-chat.api.service';

const TYPING_DEBOUNCE_MS = 450;
const REMOTE_TYPING_HIDE_MS = 2800;
const ATTACH_RETRY_MS = 450;

@Component({
  selector: 'app-agent-chat-page',
  standalone: true,
  imports: [RouterLink, UiAlertComponent, UiButtonComponent],
  templateUrl: './agent-chat.page.html',
  styleUrl: './agent-chat.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentChatPageComponent implements OnInit {
  readonly chatId = input.required<string>();

  private readonly settings = inject(APP_SETTINGS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AgentChatApiService);
  protected readonly stomp = inject(ChatStompService);
  private readonly auth = inject(AuthService);

  protected readonly showStompDebug = computed(() => !this.settings.production);

  protected readonly phase = signal<'loading' | 'active' | 'need-claim' | 'forbidden'>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly stompError = signal<string | null>(null);
  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly claiming = signal(false);
  protected readonly typingPeer = signal(false);
  protected readonly chatClosed = signal(false);

  private topicUnsub: (() => void) | undefined;
  private errorsUnsub: (() => void) | undefined;
  private remoteTypingClear: ReturnType<typeof setTimeout> | undefined;
  private autoClaimed = false;

  private readonly scheduleTypingStomp = debounceLeadingEdge(TYPING_DEBOUNCE_MS, () => {
    const id = this.chatId();
    if (id) {
      this.stomp.publishJson('/app/chat.typing', { chatId: id });
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.unbindStomp();
      if (this.remoteTypingClear !== undefined) {
        clearTimeout(this.remoteTypingClear);
      }
    });
  }

  ngOnInit(): void {
    this.stomp.connect();
    const autoClaim = this.route.snapshot.queryParamMap.get('claim') === '1';
    this.loadMessages(autoClaim);
  }

  protected onDraftInput(event: Event): void {
    const v = (event.target as HTMLTextAreaElement).value;
    this.draft.set(v);
    if (v.trim().length > 0) {
      this.scheduleTypingStomp();
    }
  }

  protected claimChat(): void {
    this.claiming.set(true);
    this.stompError.set(null);
    this.publishAttach();
    this.scheduleMessageRetries(6);
  }

  protected sendMessage(): void {
    const id = this.chatId();
    const content = this.draft().trim();
    if (!id || !content || this.chatClosed()) {
      return;
    }
    this.sending.set(true);
    this.stompError.set(null);
    this.stomp.publishJson('/app/chat.send', {
      chatId: id,
      clientMessageId: crypto.randomUUID(),
      content,
    });
    this.draft.set('');
    queueMicrotask(() => this.sending.set(false));
  }

  protected closeChat(): void {
    const id = this.chatId();
    if (!id || this.chatClosed()) {
      return;
    }
    this.stomp.publishJson('/app/chat.close', { chatId: id });
  }

  private loadMessages(tryAutoClaim: boolean): void {
    this.phase.set('loading');
    this.loadError.set(null);
    this.api.getMessages(this.chatId()).subscribe({
      next: (res) => {
        this.messages.set(sortChronological(res.messages));
        this.phase.set('active');
        this.bindStomp();
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          if (tryAutoClaim && !this.autoClaimed) {
            this.autoClaimed = true;
            this.publishAttach();
            this.scheduleMessageRetries(6);
          } else {
            this.phase.set('need-claim');
          }
        } else {
          this.phase.set('forbidden');
          this.loadError.set(this.httpErrorMessage(err));
        }
      },
    });
  }

  private publishAttach(): void {
    this.stomp.publishJson('/app/chat.attach', { chatId: this.chatId() });
  }

  private scheduleMessageRetries(attempts: number): void {
    let left = attempts;
    const run = (): void => {
      if (left <= 0) {
        this.claiming.set(false);
        this.phase.set('need-claim');
        return;
      }
      left -= 1;
      setTimeout(() => {
        this.api.getMessages(this.chatId()).subscribe({
          next: (res) => {
            this.claiming.set(false);
            this.messages.set(sortChronological(res.messages));
            this.phase.set('active');
            this.bindStomp();
          },
          error: () => run(),
        });
      }, ATTACH_RETRY_MS);
    };
    run();
  }

  private bindStomp(): void {
    this.unbindStomp();
    const id = this.chatId();
    this.topicUnsub = this.stomp.subscribe(`/topic/chat/${id}`, (m) => this.onTopicFrame(m.body));
    this.errorsUnsub = this.stomp.subscribe('/user/queue/errors', (m) => this.onErrorFrame(m.body));
  }

  private unbindStomp(): void {
    this.topicUnsub?.();
    this.errorsUnsub?.();
    this.topicUnsub = undefined;
    this.errorsUnsub = undefined;
  }

  private onTopicFrame(body: string): void {
    const ev = parseChatTopicPayload(body);
    if (!ev) {
      return;
    }
    const selfId = this.auth.profile()?.id;
    switch (ev.type) {
      case 'MESSAGE_CREATED':
        this.messages.update((list) => {
          if (list.some((m) => m.id === ev.message.id)) {
            return list;
          }
          return sortChronological([...list, ev.message]);
        });
        break;
      case 'MESSAGE_UPDATED':
        this.messages.update((list) =>
          list.map((m) =>
            m.id === ev.messageId
              ? { ...m, content: ev.content, updatedAt: ev.updatedAt, edited: true }
              : m,
          ),
        );
        break;
      case 'MESSAGE_DELETED':
        this.messages.update((list) => list.filter((m) => m.id !== ev.messageId));
        break;
      case 'CHAT_STATUS':
        if (ev.status === 'CLOSED') {
          this.chatClosed.set(true);
        }
        break;
      case 'TYPING':
        if (selfId !== undefined && ev.userId === selfId) {
          break;
        }
        this.typingPeer.set(true);
        if (this.remoteTypingClear !== undefined) {
          clearTimeout(this.remoteTypingClear);
        }
        this.remoteTypingClear = setTimeout(() => {
          this.remoteTypingClear = undefined;
          this.typingPeer.set(false);
        }, REMOTE_TYPING_HIDE_MS);
        break;
      default:
        break;
    }
  }

  private onErrorFrame(body: string): void {
    const err = parseChatStompErrorPayload(body);
    if (err) {
      this.stompError.set(err.message);
      if (err.code === 'ACCESS_DENIED') {
        this.claiming.set(false);
        this.phase.set('forbidden');
      }
    }
  }

  private httpErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.error && typeof err.error === 'object' && 'message' in err.error) {
        const m = (err.error as { message?: unknown }).message;
        if (typeof m === 'string') {
          return m;
        }
      }
      return err.message || `HTTP ${err.status}`;
    }
    return 'Request failed';
  }
}

function sortChronological(messages: ChatMessageDto[]): ChatMessageDto[] {
  return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
