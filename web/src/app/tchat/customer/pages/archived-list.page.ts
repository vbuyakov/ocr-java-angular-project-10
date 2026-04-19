import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { UiAlertComponent } from '@app/core/ui/alert/ui-alert.component';

import type { ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';
import { formatChatListLine } from '@app/tchat/util/chat-list-label';

import { CustomerChatApiService } from '../services/customer-chat.api.service';

@Component({
  selector: 'app-archived-list-page',
  standalone: true,
  imports: [RouterLink, UiAlertComponent],
  templateUrl: './archived-list.page.html',
  styleUrl: './archived-list.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedListPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(CustomerChatApiService);

  protected readonly items = signal<ChatSummaryResponse[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly chatListLine = formatChatListLine;

  ngOnInit(): void {
    this.api
      .listArchived()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(err instanceof HttpErrorResponse ? err.message : 'Failed to load');
        },
      });
  }
}
