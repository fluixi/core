import { useEffect, untrack } from '@awc/kettlejs';
import { useLocation, useNavigate } from '@awc/kettlejs/router';
import { sessionStore } from './session.store.js';
import { ROUTES } from '../../config/constants.js';

export function useAuthGuard(): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStore.isAuthenticated()) {
      const state = untrack(() => location.pathname + location.search);
      navigate(ROUTES.login, { replace: true, state: { returnTo: state } });
    }
  });
}

export function usePublicOnlyGuard(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStore.isAuthenticated()) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  });
}
