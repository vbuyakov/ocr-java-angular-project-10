/** Scrolls a chat message list container to the latest message after layout. */
export function scrollChatThreadToBottom(container: HTMLElement | null | undefined): void {
  if (!container) {
    return;
  }
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  });
}
