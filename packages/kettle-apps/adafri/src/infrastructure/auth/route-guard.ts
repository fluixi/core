import { createEffect, useEffect } from '@awc/kettlejs';
import { useLocation, useNavigate } from '@awc/kettlejs/router';
import { sessionStore } from './session.store.js';
import { authClient } from './auth-client.js';
import { ROUTES } from '../../config/constants.js';
import { createMemo, untrack } from '@awc/reactive';
import { accountStore } from '../../store/account.js';

/**
 * Reactive route guard for protected pages.
 * Uses createEffect so it re-evaluates when the session signal changes.
 *
 * Usage — call at the top of any protected layout:
 *   useAuthGuard();
 */
export function useAuthGuard(): void {
  const location = useLocation()
  const navigate = useNavigate();
  // const auth = createMemo(()=>sessionStore.isAuthenticated())

  useEffect(() => {
    // console.log('session', sessionStore.isAuthenticated())
    if (!sessionStore.isAuthenticated()) {
      console.log('not authenticated', sessionStore.token())
      const state = untrack(()=>location.pathname + location.search);
      console.log('not authenticated', state);
      // throw Error('not autheneticated')
      // Prefer in-app redirect to /login rather than going directly to OAuth
      // so the user sees the redirect screen and state is preserved.
      navigate(ROUTES.login, { replace: true, state: { returnTo: state } });
    }
  });
}

/**
 * Guard for protected pages that require an account to be selected.
 * Redirects to /select-account when authenticated but no account chosen.
 */
export function useAccountGuard(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStore.isAuthenticated()) return; // auth guard handles this
    if (!accountStore.account()) {
      navigate(ROUTES.selectAccount, { replace: true });
    }
  });
}

/**
 * Guard for public-only pages (login, callback).
 * Redirects authenticated users straight to the dashboard.
 */
export function usePublicOnlyGuard(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStore.isAuthenticated()) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  });
}
