import { createProvider } from '@awc/kettlejs';
import { sessionStore, SessionContext } from '../infrastructure/auth/session.store.js';
import { configureApiClient } from '../infrastructure/api/client.js';
import { authClient } from '../infrastructure/auth/auth-client.js';

configureApiClient(
  () => sessionStore.token() ?? '',
  () => sessionStore.destroy(),
);

authClient.initSession().catch(() => {});

export function AuthProvider({ children }: { children?: any }) {
  return createProvider({ context: SessionContext, value: sessionStore, children });
}

export function useAuth() {
  return sessionStore;
}
