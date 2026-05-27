import { Outlet, A, useLocation } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';

export default function SettingsLayout() {
  // const location = useLocation();

  return html`
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Settings</h1>
      <p class="text-sm text-gray-500 mb-4">
        Nested layout test: this layout wraps all /settings/* routes
      </p>
      <div class="flex gap-4">
        <!-- Sidebar navigation -->
        <nav class="w-48 bg-white border rounded p-3 space-y-1">
          ${A({
            href: '/settings',
            class: 'block px-3 py-2 rounded text-sm hover:bg-gray-100',
            children: 'Overview',
          })}
          ${A({
            href: '/settings/profile',
            class: 'block px-3 py-2 rounded text-sm hover:bg-gray-100',
            children: 'Profile',
          })}
          ${A({
            href: '/settings/account',
            class: 'block px-3 py-2 rounded text-sm hover:bg-gray-100',
            children: 'Account',
          })}
        </nav>

        <!-- Content area rendered by child routes via Outlet -->
        <div class="flex-1 bg-white border rounded p-4">
          ${Outlet()}
        </div>
      </div>
    </div>
  `;
}
