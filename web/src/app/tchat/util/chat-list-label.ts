import type { ChatSummaryResponse } from '@app/tchat/models/chat-rest.models';

import { formatChatDateTime } from '@app/core/util/format-chat-datetime';

export function formatChatListLine(summary: ChatSummaryResponse): string {
  const name = summary.clientUsername?.trim() || 'Client';
  return `${name} - ${formatChatDateTime(summary.createdAt)}`;
}
