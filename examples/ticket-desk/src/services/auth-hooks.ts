/**
 * The client-side half of access control.
 *
 * There are two guards in this app and they are not alternatives — they cover different
 * moments, and neither one covers the other's.
 *
 *  - `src/middleware.ts` runs on the **server**, before SSR. It is the enforcement
 *    boundary: a request for `/admin` without the role never reaches a renderer, so the
 *    markup is never produced and never sent. It is also the only one of the two an
 *    attacker cannot skip, because it runs before any of our code reaches them.
 *
 *  - `protectedRoute` below runs in the **browser**, during client-side navigation.
 *    After hydration the router swaps components locally and no request is made at all,
 *    so the middleware is not consulted and cannot be. Without this, clicking through to
 *    `/admin` in an already-loaded tab would mount the admin page with no check.
 *
 * So: the middleware protects the document, `protectedRoute` protects the navigation,
 * and neither is authorization. The actual decisions live server-side in `actions.ts`
 * and `src/api/**`, which re-check the caller's role on every call, because a determined
 * client can call those directly.
 */
import { createAuthHooks } from '@fluixi/auth/client';
import { useNavigate } from '@fluixi/start/router';
import { getRequestEvent } from '@fluixi/server';
import { userFromRequest, type AuthUser } from './auth.js';
import { currentToken } from './session.js';

/** The signed-in user, resolved the same way on both sides of the wire. */
function currentUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    // SSR: from the request the middleware already parsed.
    const user = userFromRequest(getRequestEvent()?.request as Request | undefined);
    return user.anonymous ? null : user;
  }
  const token = currentToken();
  if (!token) return null;
  const [name, roles = ''] = token.split(':');
  return name
    ? { name, roles: roles.split(',').filter(Boolean), anonymous: false }
    : null;
}

export const auth = createAuthHooks<AuthUser, unknown, (role: string) => boolean>({
  session: {
    user: currentUser,
    roles: () => (currentUser()?.roles ?? []) as string[],
    can: (query) => query(currentUser()?.roles?.[0] ?? ''),
  },
  navigate: { handler: useNavigate },
  loginPath: '/login',
  homePath: '/',
  forbiddenPath: '/403',
});

export const { protectedRoute, Can, useAuth, useUser } = auth;
