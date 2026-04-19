/**
 * Local development: use same-origin URLs so `ng serve` + [proxy.conf.json](../../proxy.conf.json)
 * forward `/auth`, `/user`, `/api`, `/ws` to the API (default `127.0.0.1:8080`).
 */
export const environment = {
  production: false,
  apiBaseUrl: '',
  wsUrl: '',
  maxChatMessageChars: 1000,
} as const;
