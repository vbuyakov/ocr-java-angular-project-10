import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { APP_SETTINGS } from '@app/core/config/app-settings';
import { ChatStompService } from '@app/core/websocket/chat-stomp.service';

@Component({
  selector: 'app-agent-home-page',
  standalone: true,
  templateUrl: './agent-home.page.html',
  styleUrl: './agent-home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentHomePageComponent implements OnInit, OnDestroy {
  private readonly settings = inject(APP_SETTINGS);
  protected readonly stomp = inject(ChatStompService);
  protected readonly showStompDebug = computed(() => !this.settings.production);

  private unsubChats: (() => void) | undefined;

  ngOnInit(): void {
    this.stomp.connect();
    this.unsubChats = this.stomp.subscribe('/user/queue/chats', () => undefined);
  }

  ngOnDestroy(): void {
    this.unsubChats?.();
  }
}
