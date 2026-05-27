import { createResource, createSignal } from '@awc/kettlejs';
import { useNavigate, useParams } from '@awc/kettlejs/router';
import { usersApi } from '../../../../infrastructure/api/users.api.js';
import { StatusBadge } from '../../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../../shared/components/ui/Spinner.js';

export default function UserDetailPage() {
  const params   = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const uid      = () => params().uid;

  const [user, { refetch }] = createResource(uid, (id) =>
    usersApi.get(id).then((u)=>u.data).catch(() => null),
  );

  const handleToggle = async () => {
    const u = user();
    if (!u) return;
    await (u.disabled ? usersApi.enable(u.uid) : usersApi.disable(u.uid));
    refetch();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await usersApi.delete(uid());
    navigate('/users', { replace: true });
  };

  return (
    <div class="page">
      <div class="page-header">
        <button class="back-btn" onClick={() => navigate('/users')}>← Users</button>
        <h1 class="page-title">User Detail</h1>
      </div>

      {() => {
        if (user.loading) return <div class="page-loading"><Spinner /></div>;
        const u = user();
        if (!u) return <div class="page-error">User not found.</div>;
        console.log('user loaded', u)
        return (
          <div class="detail-layout">
            <div class="detail-card">
              <div class="detail-card-header">
                <div class="user-avatar-large">
                  {u.photo_url
                    ? <img src={u.photo_url} alt={u.display_name ?? u.email} />
                    : <span>{(u.email[0] ?? 'U').toUpperCase()}</span>}
                </div>
                <div class="user-header-info">
                  <h2>{u.display_name ?? u.email}</h2>
                  <p class="muted">{u.email}</p>
                  <div class="user-badges">
                    <StatusBadge active={!u.disabled} />
                    {u.email_verified && <span class="badge badge-info">Email verified</span>}
                    {u.role && <span class="badge badge-neutral">{u.role}</span>}
                  </div>
                </div>
                <div class="detail-actions">
                  <button
                    class={`btn ${u.disabled ? 'btn-success' : 'btn-warning'}`}
                    onClick={handleToggle}
                  >
                    {u.disabled ? 'Enable' : 'Disable'}
                  </button>
                  <button class="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>

              <div class="detail-fields">
                <div class="detail-field">
                  <label class="field-label">UID</label>
                  <span class="field-value field-mono">{u.uid}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Email</label>
                  <span class="field-value">{u.email}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Display Name</label>
                  <span class="field-value">{u.display_name ?? '—'}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Phone</label>
                  <span class="field-value">{u.phone_number ?? '—'}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Role</label>
                  <span class="field-value">{u.role ?? 'user'}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Created</label>
                  <span class="field-value">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </div>
  );
}
