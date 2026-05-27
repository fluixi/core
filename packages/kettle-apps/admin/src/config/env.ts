function required(key: string): string {
  const v = (import.meta.env as Record<string, string>)[key];
  if (!v) throw new Error(`[AdafriAdmin] Missing required env var: ${key}`);
  return v;
}

function optional(key: string, fallback = ''): string {
  return (import.meta.env as Record<string, string>)[key] ?? fallback;
}

export const env = {
  apiUrl:         required('VITE_API_URL'),
  authServiceUrl: required('VITE_AUTH_SERVICE_URL'),
  clientId:       required('VITE_CLIENT_ID'),
  appUrl:         required('VITE_APP_URL'),
  isDev:          import.meta.env.DEV,
} as const;
