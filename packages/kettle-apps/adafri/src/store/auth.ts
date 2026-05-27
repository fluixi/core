import { createProvider } from '@awc/kettlejs';
import { sessionStore, SessionContext } from '../infrastructure/auth/session.store.js';
import { configureApiClient } from '../infrastructure/api/client.js';
import { configureWsClient } from '../infrastructure/ws/ws-client.js';
import { authClient } from '../infrastructure/auth/auth-client.js';
import { env } from '../config/env.js';

// Wire up REST API client: inject Bearer token, handle 401 → destroy session.
// destroy() clears isAuthenticated() → reactive auth guard navigates to /login.
configureApiClient(
  () => sessionStore.token() ?? '',
  () => sessionStore.destroy(),
);

// Wire up WebSocket client: same token source, connects lazily on first use.
configureWsClient(
  env.wsUrl,
  () => sessionStore.token() ?? null,
);

// On page load: validate stored token and silently refresh the user profile
// if it is stale (> 30 min). Expired tokens trigger a full OAuth redirect.
authClient.initSession().catch(() => {});

// export const AuthContext = createContext<AuthState>();

export function AuthProvider({ children }: { children?: any }) {
  return createProvider({ context: SessionContext, value: sessionStore, children });
}

export function useAuth() {
  return sessionStore;
}
