import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthService } from '@app/auth/auth.service';
import { APP_SETTINGS } from '@app/core/config/app-settings';
import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';
import { debounceLeadingEdge } from '@app/core/util/debounce';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';
import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';
import { parseChatStompErrorPayload, parseChatTopicPayload } from '@app/tchat/models/ws-events';

import { CustomerChatApiService } from '../services/customer-chat.api.service';

const TYPING_DEBOUNCE_MS = 450;
const REMOTE_TYPING_HIDE_MS = 2800;

@Component({
  selector: 'app-support-chat-page',
  standalone: true,
  imports: [RouterLink, UiAlertComponent, UiButtonComponent],
  templateUrl: './support-chat.page.html',
  styleUrl: './support-chat.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportChatPageComponent implements OnInit {
  private readonly settings = inject(APP_SETTINGS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(CustomerChatApiService);
  protected readonly stomp = inject(ChatStompService);
  private readonly auth = inject(AuthService);

  protected readonly showStompDebug = computed(() => !this.settings.production);

  protected readonly phase = signal<'loading' | 'need-start' | 'active' | 'error'>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly stompError = signal<string | null>(null);
  protected readonly chatId = signal<string | null>(null);
  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected readonly initialDraft = signal('');
  protected readonly draft = signal('');
  protected readonly submittingStart = signal(false);
  protected readonly sending = signal(false);
  protected readonly typingPeer = signal(false);
  protected readonly chatClosed = signal(false);

  private topicUnsub: (() => void) | undefined;
  private errorsUnsub: (() => void) | undefined;
  private remoteTypingClear: ReturnType<typeof setTimeout> | undefined;
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
    this.api
      .getActiveChat()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (active) => {
          if (active) {
            this.chatId.set(active.chatId);
            this.phase.set('active');
            this.hydrateMessagesAndStomp(active.chatId);
          } else {
            this.phase.set('need-start');
          }
        },
        error: (err: unknown) => {
          this.phase.set('error');
          this.loadError.set(this.httpErrorMessage(err));
        },
      });
  }

  protected onInitialInput(event: Event): void {
    const v = (event.target as HTMLTextAreaElement).value;
    this.initialDraft.set(v);
  }

  protected onDraftInput(event: Event): void {
    const v = (event.target as HTMLTextAreaElement).value;
    this.draft.set(v);
    if (v.trim().length > 0) {
      this.scheduleTypingStomp();
    }
  }

  protected startChat(): void {
    const text = this.initialDraft().trim();
    if (!text) {
      return;
    }
    this.submittingStart.set(true);
    this.loadError.set(null);
    this.api
      .createActiveChat(text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submittingStart.set(false);
          this.chatId.set(res.chatId);
          this.phase.set('active');
          this.initialDraft.set('');
          this.hydrateMessagesAndStomp(res.chatId);
        },
        error: (err: unknown) => {
          this.submittingStart.set(false);
          this.loadError.set(this.httpErrorMessage(err));
        },
      });
  }

  protected sendMessage(): void {
    const id = this.chatId();
    const content = this.draft().trim();
    if (!id || !content) {
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

  private hydrateMessagesAndStomp(chatId: string): void {
    this.bindStomp(chatId);
    this.api
      .getMessages(chatId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.messages.set(res.messages),
        error: (err: unknown) => this.loadError.set(this.httpErrorMessage(err)),
      });
  }

  private bindStomp(chatId: string): void {
    this.unbindStomp();
    const topic = `/topic/chat/${chatId}`;
    this.topicUnsub = this.stomp.subscribe(topic, (m) => this.onTopicFrame(m.body));
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
