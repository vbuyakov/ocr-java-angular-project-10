/** Production build — override via CI or file replacement as needed. */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: 'http://localhost:8080',
} as const;
