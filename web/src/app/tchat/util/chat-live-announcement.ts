import type { ChatMessageDto } from '@app/tchat/models/chat-rest.models';

export type ChatTranslateFn = (key: string, params?: Record<string, string | number>) => string;

const PREVIEW_MAX = 80;

/**
 * When the message list grows, returns copy for an `aria-live` region so new messages are announced.
 */
export function nextMessageLiveAnnouncement(
  previousCount: number,
  messages: readonly ChatMessageDto[],
  translate: ChatTranslateFn,
): { count: number; text: string | null } {
  const n = messages.length;
  if (n <= previousCount || n === 0) {
    return { count: n, text: null };
  }
  const last = messages[n - 1]!;
  const preview =
    last.content.length > PREVIEW_MAX ? `${last.content.slice(0, PREVIEW_MAX - 1)}…` : last.content;
  const label = last.senderUsername?.trim();
  const who = label && label.length > 0 ? label : translate('chat.someone');
  return {
    count: n,
    text: translate('chat.liveNewMessage', { who, preview }),
  };
}
