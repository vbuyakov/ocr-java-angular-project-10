import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';
import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';

import { CustomerChatApiService } from '../services/customer-chat.api.service';

@Component({
  selector: 'app-archived-thread-page',
  standalone: true,
  imports: [RouterLink, UiAlertComponent],
  templateUrl: './archived-thread.page.html',
  styleUrl: './archived-thread.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedThreadPageComponent implements OnInit {
  readonly chatId = input.required<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(CustomerChatApiService);

  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.chatId();
    this.api
      .getMessages(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.messages.set(res.messages);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(err instanceof HttpErrorResponse ? err.message : 'Failed to load');
        },
      });
  }
}
