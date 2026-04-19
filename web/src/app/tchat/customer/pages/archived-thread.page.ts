import { HttpErrorResponse } from '@angular/common/http';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthService } from '@app/auth/auth.service';
import { ChatDateTimePipe } from '@app/core/pipes/chat-datetime.pipe';
import { I18nService } from '@app/core/i18n/i18n.service';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';
import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';
import { buildChatMessageRows, type ChatMessageRow } from '@app/tchat/util/chat-message-rows';

import { CustomerChatApiService } from '../services/customer-chat.api.service';

@Component({
  selector: 'app-archived-thread-page',
  standalone: true,
  imports: [RouterLink, UiAlertComponent, TranslatePipe, ChatDateTimePipe],
  templateUrl: './archived-thread.page.html',
  styleUrls: ['./archived-thread.page.css', '../../styles/chat-bubbles.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedThreadPageComponent implements OnInit {
  readonly chatId = input.required<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  private readonly api = inject(CustomerChatApiService);
  protected readonly auth = inject(AuthService);

  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly messageRows = computed<ChatMessageRow[]>(() => buildChatMessageRows(this.messages()));

  ngOnInit(): void {
    const id = this.chatId();
    this.api
      .getMessages(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.messages.set(sortChronological(res.messages));
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(
            err instanceof HttpErrorResponse ? err.message : this.i18n.translate('errors.genericLoad'),
          );
        },
      });
  }
}

function sortChronological(messages: ChatMessageDto[]): ChatMessageDto[] {
  return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
