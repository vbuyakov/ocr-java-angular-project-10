import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';

import { AuthService } from '@app/auth/auth.service';
import { APP_SETTINGS } from '@app/core/config/app-settings';
import { I18nService } from '@app/core/i18n/i18n.service';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';
import { ChatDateTimePipe } from '@app/core/pipes/chat-datetime.pipe';
import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import { UiButtonComponent } from '@app/core/ui/button/ui-button.component';
import { UiModalComponent } from '@app/core/ui/modal/ui-modal.component';
import { debounceLeadingEdge } from '@app/core/util/debounce';
import { formatChatDateTime } from '@app/core/util/format-chat-datetime';
import { scrollChatThreadToBottom } from '@app/core/util/scroll-thread';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';
import type { ChatMessageDto, ChatMessagesResponse, ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';
import { parseChatStompErrorPayload, parseChatTopicPayload } from '@app/tchat/models/ws-events';
import { buildChatMessageRows, type ChatMessageRow } from '@app/tchat/util/chat-message-rows';

import { AgentChatApiService } from '../services/agent-chat.api.service';

const TYPING_DEBOUNCE_MS = 450;
const REMOTE_TYPING_HIDE_MS = 2800;
const ATTACH_RETRY_MS = 450;

@Component({
  selector: 'app-agent-chat-page',
  standalone: true,
  imports: [RouterLink, UiAlertComponent, UiButtonComponent, UiModalComponent, TranslatePipe, ChatDateTimePipe],
  templateUrl: './agent-chat.page.html',
  styleUrls: ['./agent-chat.page.css', '../../styles/chat-bubbles.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentChatPageComponent implements OnInit {
  readonly chatId = input.required<string>();

  private readonly appSettings = inject(APP_SETTINGS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AgentChatApiService);
  protected readonly stomp = inject(ChatStompService);
  protected readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly phase = signal<'loading' | 'active' | 'need-claim' | 'forbidden'>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly stompError = signal<string | null>(null);
  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly claiming = signal(false);
  protected readonly typingPeerLabel = signal<string | null>(null);
  protected readonly chatClosed = signal(false);
  private readonly chatMeta = signal<{ clientUsername: string; chatCreatedAt: string } | null>(null);

  protected readonly messageRows = computed<ChatMessageRow[]>(() => buildChatMessageRows(this.messages()));

  protected readonly chatClientHeadline = computed(() => {
    const m = this.chatMeta();
    if (!m) {
      return null;
    }
    return `${m.clientUsername} - ${formatChatDateTime(m.chatCreatedAt)}`;
  });

  protected readonly composeCharsRemaining = computed(
    () => this.appSettings.maxChatMessageChars - this.draft().length,
  );

  protected readonly sendDisabled = computed(
    () =>
      this.sending() ||
      this.draft().trim().length === 0 ||
      this.draft().length > this.appSettings.maxChatMessageChars,
  );

  private readonly chatMsgList = viewChild<ElementRef<HTMLElement>>('chatMsgList');

  private topicUnsub: (() => void) | undefined;
  private errorsUnsub: (() => void) | undefined;
  private remoteTypingClear: ReturnType<typeof setTimeout> | undefined;
  private autoClaimed = false;

  protected readonly closeChatConfirmOpen = signal(false);

  private readonly scheduleTypingStomp = debounceLeadingEdge(TYPING_DEBOUNCE_MS, () => {
    const id = this.chatId();
    if (!id || this.draft().trim().length === 0) {
      return;
    }
    this.stomp.publishJson('/app/chat.typing', { chatId: id });
  });

  constructor() {
    effect(() => {
      this.messages();
      scrollChatThreadToBottom(this.chatMsgList()?.nativeElement);
    });
    this.destroyRef.onDestroy(() => {
      this.unbindStomp();
      if (this.remoteTypingClear !== undefined) {
        clearTimeout(this.remoteTypingClear);
      }
    });
  }

  protected get maxMessageChars(): number {
    return this.appSettings.maxChatMessageChars;
  }

  ngOnInit(): void {
    this.stomp.connect();
    this.loadChatHeadline();
    const autoClaim = this.route.snapshot.queryParamMap.get('claim') === '1';
    this.loadMessages(autoClaim);
  }

  private loadChatHeadline(): void {
    this.api.getChatSummary(this.chatId()).subscribe({
      next: (s) => this.applyHeadlineFromSummary(s),
      error: () => {
        /* headline optional if request fails */
      },
    });
  }

  private applyHeadlineFromSummary(s: ChatSummaryResponse): void {
    const u = s.clientUsername?.trim();
    const c = s.createdAt;
    if (u && c) {
      this.chatMeta.set({ clientUsername: u, chatCreatedAt: c });
    }
  }

  protected onDraftInput(event: Event): void {
    const v = (event.target as HTMLTextAreaElement).value;
    this.draft.set(v);
    if (v.trim().length > 0) {
      this.scheduleTypingStomp();
    }
  }

  protected onComposeKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (this.sendDisabled()) {
      return;
    }
    this.sendMessage();
  }

  protected claimChat(): void {
    this.claiming.set(true);
    this.stompError.set(null);
    this.publishAttach();
    this.scheduleMessageRetries(6);
  }

  protected sendMessage(): void {
    const id = this.chatId();
    const raw = this.draft();
    if (raw.length > this.appSettings.maxChatMessageChars) {
      return;
    }
    const content = raw.trim();
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
    this.closeChatConfirmOpen.set(true);
  }

  protected onCloseChatConfirmed(): void {
    const id = this.chatId();
    if (!id || this.chatClosed()) {
      return;
    }
    this.stomp.publishJson('/app/chat.close', { chatId: id });
  }

  protected leaveChat(): void {
    const id = this.chatId();
    if (!id || this.chatClosed()) {
      return;
    }
    this.stomp.publishJson('/app/chat.detach', { chatId: id });
  }

  private loadMessages(tryAutoClaim: boolean): void {
    this.phase.set('loading');
    this.loadError.set(null);
    this.api.getMessages(this.chatId()).subscribe({
      next: (res) => {
        this.applyMessagesResponse(res);
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
            this.applyMessagesResponse(res);
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
        if (selfId === undefined || ev.message.senderId !== selfId) {
          this.clearRemoteTypingIndicator();
        }
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
      case 'USER_LEFT':
        if (selfId !== undefined && ev.userId === selfId) {
          void this.router.navigate(['/agent']);
        }
        break;
      case 'TYPING_STOPPED':
        if (selfId !== undefined && ev.userId === selfId) {
          break;
        }
        this.clearRemoteTypingIndicator();
        break;
      case 'TYPING':
        if (selfId !== undefined && ev.userId === selfId) {
          break;
        }
        {
          const label =
            ev.username?.trim() ||
            this.findUsernameForSender(ev.userId) ||
            this.i18n.translate('chat.someone');
          this.typingPeerLabel.set(label);
        }
        if (this.remoteTypingClear !== undefined) {
          clearTimeout(this.remoteTypingClear);
        }
        this.remoteTypingClear = setTimeout(() => {
          this.clearRemoteTypingIndicator();
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

  private clearRemoteTypingIndicator(): void {
    if (this.remoteTypingClear !== undefined) {
      clearTimeout(this.remoteTypingClear);
      this.remoteTypingClear = undefined;
    }
    this.typingPeerLabel.set(null);
  }

  private applyMessagesResponse(res: ChatMessagesResponse): void {
    this.messages.set(sortChronological(res.messages));
    const u = res.clientUsername?.trim();
    const c = res.chatCreatedAt;
    if (u && c) {
      this.chatMeta.set({ clientUsername: u, chatCreatedAt: c });
    }
  }

  private findUsernameForSender(userId: string): string | undefined {
    return this.messages().find((m) => m.senderId === userId)?.senderUsername;
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
