import { Outlet } from '@awc/kettlejs/router';
import { useAuthGuard } from '../../infrastructure/auth/route-guard.js';
import { Sidebar } from '../../shared/components/layout/Sidebar.js';
import { Topbar } from '../../shared/components/layout/Topbar.js';

export default function AppLayout() {
  useAuthGuard();

  return (
    <div class="admin-layout">
      <Sidebar />
      <div class="admin-main">
        <Topbar />
        <main class="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
