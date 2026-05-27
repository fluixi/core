import { Outlet } from '@awc/kettlejs/router';
import { useAuthGuard } from '../../infrastructure/auth/route-guard.js';
import { Topbar } from '../../shared/components/layout/Topbar.jsx';

export default function AccountSelectLayout() {
  useAuthGuard();
  return (
    <div class="public-layout flex flex-col justify-start w-full">
      <Topbar class="w-full"></Topbar>
      <Outlet />
    </div>
  );
}
