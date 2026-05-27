import { useLocation, useNavigate } from '@awc/kettlejs/router';
import { createMemo } from '@awc/kettlejs';
import { authClient } from '../../../infrastructure/auth/auth-client.js';

interface NavItem {
  label: string;
  path:  string;
  icon:  string;
}

interface NavSection {
  title?: string;
  items:  NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard',     path: '/dashboard',     icon: '▦' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Users',         path: '/users',         icon: '👤' },
      { label: 'Accounts',      path: '/accounts',      icon: '🏢' },
    ],
  },
  {
    title: 'OAuth',
    items: [
      { label: 'OAuth Clients', path: '/oauth-clients', icon: '🔑' },
      { label: 'Tokens',        path: '/tokens',        icon: '🎟' },
      { label: 'Auth Codes',    path: '/codes',         icon: '📋' },
    ],
  },
  {
    title: 'Access Control',
    items: [
      { label: 'Admin Users',   path: '/admin-users',   icon: '🛡' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    createMemo(() => location.pathname === path || location.pathname.startsWith(path + '/'));

  return (
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <span class="sidebar-logo-icon">⚡</span>
          <span class="sidebar-logo-text">Adafri Admin</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div class="sidebar-section">
            {section.title && <span class="sidebar-section-title">{section.title}</span>}
            <ul class="sidebar-nav-list">
              {section.items.map((item) => (
                <li>
                  <button
                    class={`sidebar-nav-item ${isActive(item.path)() ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                    type="button"
                  >
                    <span class="nav-icon">{item.icon}</span>
                    <span class="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div class="sidebar-footer">
        <button
          class="sidebar-logout-btn"
          type="button"
          onClick={() => authClient.logout()}
        >
          <span class="nav-icon">↩</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
