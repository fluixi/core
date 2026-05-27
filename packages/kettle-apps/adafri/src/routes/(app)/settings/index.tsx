import { useSession } from '../../../infrastructure/auth/session.store.js';
import { useTheme } from '../../../store/theme.js';
import { Card } from '../../../shared/components/ui/Card.js';

export default function SettingsPage() {
  const session = useSession();
  const theme   = useTheme();
  const user    = () => session.user();

  return (
    <div class="page page-settings">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
      </div>

      <div class="settings-grid">
        <Card title="Profile">
          <dl class="detail-list">
            <dt>Name</dt>    <dd>{() => user()?.name ?? '—'}</dd>
            <dt>Email</dt>   <dd>{() => user()?.email ?? '—'}</dd>
            <dt>Role</dt>    <dd>{() => user()?.role ?? '—'}</dd>
          </dl>
        </Card>

        <Card title="Appearance">
          <div class="settings-row">
            <span>Theme</span>
            <div class="theme-toggle-group">
              <button
                class={() => `btn btn-sm ${theme.theme() === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                type="button"
                onClick={() => theme.set('light')}
              >
                Light
              </button>
              <button
                class={() => `btn btn-sm ${theme.theme() === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                type="button"
                onClick={() => theme.set('dark')}
              >
                Dark
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
