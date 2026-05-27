import { createEffect, useEffect } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { ROUTES } from '../config/constants.js';

/**
 * Root redirect: / → /dashboard
 * The app layout's useAuthGuard will redirect to /login if not authenticated.
 */
export default function IndexPage() {
  const navigate = useNavigate();
  useEffect(() => navigate(ROUTES.dashboard, { replace: true }));
  return null;
}
