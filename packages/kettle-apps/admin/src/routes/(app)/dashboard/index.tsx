import { createResource } from '@awc/kettlejs';
import { usersApi } from '../../../infrastructure/api/users.api.js';
import { oauthClientsApi } from '../../../infrastructure/api/oauth-clients.api.js';
import { accountsApi } from '../../../infrastructure/api/accounts.api.js';
import { adminUsersApi } from '../../../infrastructure/api/admin-users.api.js';
import { StatCard } from '../../../shared/components/ui/StatCard.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';

export default function DashboardPage() {
  const [usersData]   = createResource(() => usersApi.list({ limit: 1 }).catch(() => null));
  const [clientsData] = createResource(() => oauthClientsApi.list({ limit: 1 }).catch(() => null));
  const [accountsData]= createResource(() => accountsApi.list({ limit: 1 }).catch(() => null));
  const [adminsData]  = createResource(() => adminUsersApi.list({ limit: 1 }).catch(() => null));

  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Platform overview</p>
      </div>

      <div class="stats-grid">
        {() => (usersData.loading || clientsData.loading || accountsData.loading || adminsData.loading)
          ? <div class="stats-loading"><Spinner /></div>
          : (
            <>
              <StatCard label="Total Users"   value={usersData()?.count ?? '—'}   icon="👤" color="brand"   />
              <StatCard label="OAuth Clients" value={clientsData()?.count ?? '—'} icon="🔑" color="success" />
              <StatCard label="Accounts"      value={accountsData()?.count ?? '—'}icon="🏢" color="warning" />
              <StatCard label="Admin Users"   value={adminsData()?.count ?? '—'}  icon="🛡" color="danger"  />
            </>
          )
        }
      </div>

      <div class="dashboard-sections">
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">Quick Actions</h2>
          </div>
          <div class="quick-actions">
            <a href="/users" class="quick-action-card">
              <span class="quick-action-icon">👤</span>
              <span class="quick-action-label">Manage Users</span>
            </a>
            <a href="/oauth-clients" class="quick-action-card">
              <span class="quick-action-icon">🔑</span>
              <span class="quick-action-label">OAuth Clients</span>
            </a>
            <a href="/accounts" class="quick-action-card">
              <span class="quick-action-icon">🏢</span>
              <span class="quick-action-label">Accounts</span>
            </a>
            <a href="/admin-users" class="quick-action-card">
              <span class="quick-action-icon">🛡</span>
              <span class="quick-action-label">Admin Users</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
