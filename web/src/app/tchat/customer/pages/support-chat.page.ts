import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';

import { APP_SETTINGS } from '@app/core/config/app-settings';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';

@Component({
  selector: 'app-support-chat-page',
  standalone: true,
  templateUrl: './support-chat.page.html',
  styleUrl: './support-chat.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportChatPageComponent implements OnInit {
  private readonly settings = inject(APP_SETTINGS);
  protected readonly stomp = inject(ChatStompService);
  protected readonly showStompDebug = computed(() => !this.settings.production);

  ngOnInit(): void {
    this.stomp.connect();
  }
}
