/** Production build — override via CI or file replacement as needed. */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: 'http://localhost:8080',
  /** Client-side max length for chat message input (align with API if applicable). */
  maxChatMessageChars: 1000,
  /** Default UI language when no `localStorage` override (`ycyw.locale`). */
  defaultLocale: 'fr' as const,
} as const;
