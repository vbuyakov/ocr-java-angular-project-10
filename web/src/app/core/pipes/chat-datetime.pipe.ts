import { Pipe, PipeTransform } from '@angular/core';

import { formatChatDateTime } from '@app/core/util/format-chat-datetime';

@Pipe({
  name: 'chatDateTime',
  standalone: true,
})
export class ChatDateTimePipe implements PipeTransform {
  transform(value: string): string {
    return formatChatDateTime(value);
  }
}
