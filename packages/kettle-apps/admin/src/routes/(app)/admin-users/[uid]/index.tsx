import { createResource, createSignal, createMemo } from '@awc/kettlejs';
import { useNavigate, useParams } from '@awc/kettlejs/router';
import { adminUsersApi } from '../../../../infrastructure/api/admin-users.api.js';
import { Badge } from '../../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../../shared/components/ui/Spinner.js';
import { ADMIN_ROLES, ROLE_LABELS, ROLE_COLORS, type AdminRole } from '../../../../domain/admin-users/admin-user.model.js';

export default function AdminUserDetailPage() {
  const params   = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const uid      = () => params().uid;
  const [saving, setSaving]               = createSignal(false);
  const [savingPerms, setSavingPerms]     = createSignal(false);
  const [selectedRole, setSelectedRole]   = createSignal<AdminRole | null>(null);
  const [customPerms, setCustomPerms]     = createSignal<string[] | null>(null);

  const [admin, { refetch }] = createResource(uid, (id) =>
    adminUsersApi.get(id).then(a=>a.data).catch(() => null),
  );

  const [perms] = createResource(() =>
    adminUsersApi.getPermissions().then(p=>p.data).catch(() => null),
  );

  const effectiveRole = () => selectedRole() ?? admin()?.role ?? 'viewer';

  // Working copy of custom_permissions — starts from server value when loaded
  const workingPerms = () => customPerms() ?? admin()?.custom_permissions ?? [];

  const isPermChecked = (perm: string) => workingPerms().includes(perm);

  const togglePerm = (perm: string) => {
    const current = workingPerms();
    setCustomPerms(
      current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm],
    );
  };

  const permsDirty = () => {
    const a = admin();
    if (!a || customPerms() === null) return false;
    const orig = [...(a.custom_permissions ?? [])].sort().join(',');
    const curr = [...workingPerms()].sort().join(',');
    return orig !== curr;
  };

  const handleSaveRole = async () => {
    const role = selectedRole();
    if (!role) return;
    setSaving(true);
    try {
      await adminUsersApi.update(uid(), { role });
      setSelectedRole(null);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerms = async () => {
    setSavingPerms(true);
    try {
      await adminUsersApi.update(uid(), { custom_permissions: workingPerms() });
      setCustomPerms(null);
      refetch();
    } finally {
      setSavingPerms(false);
    }
  };

  const handleToggleActive = async () => {
    const a = admin();
    if (!a) return;
    await adminUsersApi.update(uid(), { is_active: !a.is_active });
    refetch();
  };

  const handleDelete = async () => {
    if (!confirm('Remove this admin user? They will lose all admin access.')) return;
    await adminUsersApi.delete(uid());
    navigate('/admin-users', { replace: true });
  };

  return (
    <div class="page">
      <div class="page-header">
        <button class="back-btn" onClick={() => navigate('/admin-users')}>← Admin Users</button>
        <h1 class="page-title">Admin User Detail</h1>
      </div>

      {() => {
        if (admin.loading) return <div class="page-loading"><Spinner /></div>;
        const a = admin();
        if (!a) return <div class="page-error">Admin user not found.</div>;

        return (
          <div class="detail-layout">
            <div class="detail-card">
              <div class="detail-card-header">
                <div class="user-avatar-large">
                  {(a.email[0] ?? 'A').toUpperCase()}
                </div>
                <div class="user-header-info">
                  <h2>{a.display_name || a.email}</h2>
                  <p class="muted">{a.email}</p>
                  <div class="user-badges">
                    <Badge variant={ROLE_COLORS[a.role] as any}>{ROLE_LABELS[a.role]}</Badge>
                    <Badge variant={a.is_active ? 'success' : 'neutral'}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div class="detail-actions">
                  <button
                    class={`btn ${a.is_active ? 'btn-warning' : 'btn-success'}`}
                    onClick={handleToggleActive}
                  >
                    {a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button class="btn btn-danger" onClick={handleDelete}>Remove</button>
                </div>
              </div>

              <div class="detail-fields">
                <div class="detail-field">
                  <label class="field-label">UID</label>
                  <span class="field-value field-mono">{a.uid}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Created by</label>
                  <span class="field-value">{a.created_by ?? 'system'}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Created</label>
                  <span class="field-value">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Last updated</label>
                  <span class="field-value">{a.updatedAt ? new Date(a.updatedAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            </div>

            {/* Role editor */}
            <div class="detail-card" style="margin-top: 24px">
              <div class="section-header" style="padding: 20px 24px; border-bottom: 1px solid var(--color-border-soft)">
                <h3 class="section-title">Access Level</h3>
                <p class="page-subtitle">Change the role to update permissions. Custom permissions are added on top of the role defaults.</p>
              </div>

              <div style="padding: 24px">
                <div class="role-picker">
                  {ADMIN_ROLES.map(role => (
                    <button
                      class={`role-card ${effectiveRole() === role ? 'role-card--active' : ''}`}
                      onClick={() => setSelectedRole(role)}
                      type="button"
                    >
                      <div class="role-card-header">
                        <Badge variant={ROLE_COLORS[role] as any}>{ROLE_LABELS[role]}</Badge>
                      </div>
                      <ul class="role-perms-preview">
                        {() => {
                          const p = perms();
                          const rolePerms = p?.permissions[role] ?? [];
                          return rolePerms.slice(0, 5).map(perm => (
                            <li class="role-perm-item">✓ {perm}</li>
                          ));
                        }}
                        {() => {
                          const p = perms();
                          const count = (p?.permissions[role] ?? []).length;
                          return count > 5 ? <li class="role-perm-more">+ {count - 5} more</li> : null;
                        }}
                      </ul>
                    </button>
                  ))}
                </div>

                {() => selectedRole() && selectedRole() !== a.role && (
                  <div class="role-save-bar">
                    <p>Change role from <strong>{ROLE_LABELS[a.role]}</strong> → <strong>{ROLE_LABELS[selectedRole()!]}</strong></p>
                    <div class="role-save-actions">
                      <button class="btn btn-secondary btn-sm" onClick={() => setSelectedRole(null)}>Cancel</button>
                      <button class="btn btn-primary btn-sm" onClick={handleSaveRole} disabled={saving()}>
                        {saving() ? 'Saving…' : 'Save Role'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current effective permissions */}
            <div class="detail-card" style="margin-top: 24px">
              <div class="section-header" style="padding: 20px 24px; border-bottom: 1px solid var(--color-border-soft)">
                <h3 class="section-title">Effective Permissions</h3>
              </div>
              <div class="perms-grid">
                {a.effective_permissions.map(perm => (
                  <span class={`perm-chip ${workingPerms().includes(perm) ? 'perm-chip--custom' : ''}`}>
                    ✓ {perm}{workingPerms().includes(perm) ? ' *' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Custom permissions editor */}
            <div class="detail-card" style="margin-top: 24px">
              <div class="section-header" style="padding: 20px 24px; border-bottom: 1px solid var(--color-border-soft)">
                <div>
                  <h3 class="section-title">Custom Permissions</h3>
                  <p class="page-subtitle">
                    Grant individual permissions on top of the role defaults.
                    Checked items are added to this admin's access regardless of their role.
                  </p>
                </div>
              </div>
              <div style="padding: 20px 24px">
                {() => {
                  const p = perms();
                  if (!p) return <Spinner />;
                  const allPerms: string[] = Object.values(p.permissions)
                    .flat()
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .sort();

                  return (
                    <div>
                      <div class="perms-editor-grid">
                        {allPerms.map(perm => {
                          const fromRole = (p.permissions[effectiveRole()] ?? []).includes(perm);
                          return (
                            <label class={`perm-editor-item ${fromRole ? 'perm-editor-item--from-role' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isPermChecked(perm) || fromRole}
                                disabled={fromRole}
                                onChange={() => !fromRole && togglePerm(perm)}
                              />
                              <span class="perm-editor-label">{perm}</span>
                              {fromRole && <span class="perm-role-badge">role</span>}
                            </label>
                          );
                        })}
                      </div>

                      {() => permsDirty() && (
                        <div class="role-save-bar" style="margin-top: 16px">
                          <p>
                            Custom permissions changed —
                            <strong> {workingPerms().length}</strong> extra permission{workingPerms().length !== 1 ? 's' : ''} granted
                          </p>
                          <div class="role-save-actions">
                            <button
                              class="btn btn-secondary btn-sm"
                              onClick={() => setCustomPerms(null)}
                            >
                              Cancel
                            </button>
                            <button
                              class="btn btn-primary btn-sm"
                              onClick={handleSavePerms}
                              disabled={savingPerms()}
                            >
                              {savingPerms() ? 'Saving…' : 'Save Permissions'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              </div>
            </div>
          </div>
        );
      }}
    </div>
  );
}
