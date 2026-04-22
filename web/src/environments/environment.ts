/**
 * Production: same origin as the SPA (use dev proxy or a reverse proxy in front of the API).
 * Docker: nginx serves the app and proxies /api, /auth, /user, /ws to Spring Boot.
 */
export const environment = {
  production: true,
  apiBaseUrl: '',
  wsUrl: '',
  /** Client-side max length for chat message input (align with API if applicable). */
  maxChatMessageChars: 1000,
  /** Default UI language when no `localStorage` override (`ycyw.locale`). */
  defaultLocale: 'fr' as const,
} as const;
