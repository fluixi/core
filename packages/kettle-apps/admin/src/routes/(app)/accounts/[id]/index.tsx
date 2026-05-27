import { createResource } from '@awc/kettlejs';
import { useNavigate, useParams } from '@awc/kettlejs/router';
import { accountsApi } from '../../../../infrastructure/api/accounts.api.js';
import { StatusBadge } from '../../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../../shared/components/ui/Spinner.js';

export default function AccountDetailPage() {
  const params   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id       = () => params().id;

  const [account] = createResource(id, (aid) =>
    accountsApi.get(aid).catch(() => null),
  );

  const handleDelete = async () => {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    await accountsApi.delete(id());
    navigate('/accounts', { replace: true });
  };

  return (
    <div class="page">
      <div class="page-header">
        <button class="back-btn" onClick={() => navigate('/accounts')}>← Accounts</button>
        <h1 class="page-title">Account Detail</h1>
      </div>

      {() => {
        if (account.loading) return <div class="page-loading"><Spinner /></div>;
        const a = account();
        if (!a) return <div class="page-error">Account not found.</div>;

        return (
          <div class="detail-layout">
            <div class="detail-card">
              <div class="detail-card-header">
                <div class="client-icon">🏢</div>
                <div class="user-header-info">
                  <h2>{a.name}</h2>
                  <p class="muted">{a.plan ?? 'free'} plan</p>
                  <div class="user-badges">
                    <StatusBadge active={a.is_active} />
                  </div>
                </div>
                <div class="detail-actions">
                  <button class="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>

              <div class="detail-fields">
                <div class="detail-field">
                  <label class="field-label">ID</label>
                  <span class="field-value field-mono">{a.id}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Name</label>
                  <span class="field-value">{a.name}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Owner UID</label>
                  <span class="field-value field-mono">
                    <a href={`/users/${a.owner_uid}`} class="link">{a.owner_uid}</a>
                  </span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Plan</label>
                  <span class="field-value">{a.plan ?? 'free'}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Members</label>
                  <span class="field-value">{a.members?.length ?? 0}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Created</label>
                  <span class="field-value">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </div>
  );
}
