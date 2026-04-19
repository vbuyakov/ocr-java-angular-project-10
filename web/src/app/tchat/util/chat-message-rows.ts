import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';

export interface ChatMessageRow {
  readonly message: ChatMessageDto;
  readonly isFirstInGroup: boolean;
}

export function buildChatMessageRows(messages: ChatMessageDto[]): ChatMessageRow[] {
  return messages.map((m, i) => ({
    message: m,
    isFirstInGroup: i === 0 || messages[i - 1].senderId !== m.senderId,
  }));
}
