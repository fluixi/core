import { Outlet } from '@awc/kettlejs/router';
import { usePublicOnlyGuard } from '../../infrastructure/auth/route-guard.js';

export default function PublicLayout() {
  usePublicOnlyGuard();
  return <Outlet />;
}
