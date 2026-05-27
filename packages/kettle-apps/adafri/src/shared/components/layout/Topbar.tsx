import { useSession } from '../../../infrastructure/auth/session.store.js';
import { useTheme } from '../../../store/theme.js';
import { authClient } from '../../../infrastructure/auth/auth-client.js';
import Drawer from '../ui/webcomponents/drawer.jsx';

export function Topbar() {
  const session = useSession();
  const theme   = useTheme();

  const user = () => session?.user();

  return (
    <Drawer.Header class="topbar w-full">
        {/* <div class="topbar-left">
          <button class="topbar-menu-btn" aria-label="Toggle sidebar" type="button">
            ☰
          </button>
        </div> */}

        <div class="topbar-right flex w-100 justify-end items-center">
          <button
            class="topbar-theme-btn"
            type="button"
            aria-label="Toggle theme"
            onClick={() => theme.toggle()}
          >
            {() => theme.theme() === 'dark' ? '☀️' : '🌙'}
          </button>

          <div class="topbar-user">
            {() => user()?.photoURL
              ? <img src={user()!.photoURL} alt={user()!.fullName} class="avatar" />
              : <span class="avatar-fallback">{() => user()?.fullName?.[0] ?? '?'}</span>
            }
            <span class="topbar-username">{() => user()?.fullName ?? ''}</span>
          </div>

          <button
            class="topbar-logout-btn"
            type="button"
            onClick={() => authClient.logout()}
            title="Sign out"
          >
            ↩
          </button>
        </div>
    </Drawer.Header>
  );
}
