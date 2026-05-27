/**
 * Typed, fail-fast environment variable accessor.
 * All VITE_* variables must be declared here — never read import.meta.env directly.
 */
function required(key: string): string {
  const v = (import.meta.env as Record<string, string>)[key];
  if (!v) throw new Error(`[Adafri] Missing required env var: ${key}`);
  return v;
}

function optional(key: string, fallback = ''): string {
  return (import.meta.env as Record<string, string>)[key] ?? fallback;
}

export const env = {
  apiUrl:         required('VITE_API_URL'),
  // WebSocket base URL — defaults to the API server without the /v1 path.
  // Override with VITE_WS_URL in production if the WS server differs.
  wsUrl:          optional('VITE_WS_URL') || required('VITE_API_URL').replace(/\/v1\/?$/, ''),
  authServiceUrl: required('VITE_AUTH_SERVICE_URL'),
  clientId:       required('VITE_CLIENT_ID'),
  appUrl:         required('VITE_APP_URL'),
  isDev:          import.meta.env.DEV,
} as const;
