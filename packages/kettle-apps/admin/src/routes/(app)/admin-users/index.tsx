import { createResource, createSignal } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { adminUsersApi } from '../../../infrastructure/api/admin-users.api.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { EmptyState } from '../../../shared/components/ui/EmptyState.js';
import { Badge } from '../../../shared/components/ui/Badge.js';
import {
  ADMIN_ROLES, ROLE_LABELS, ROLE_COLORS,
  type AdminRole, type AdminUser, type CreateAdminUserDto,
} from '../../../domain/admin-users/admin-user.model.js';
import Dialog from '../../../shared/uid/webcomponents/dialog.jsx';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [page, setPage]             = createSignal(1);

  // Create modal state
  const [showCreate, setShowCreate] = createSignal(false);
  const [creating, setCreating]     = createSignal(false);
  const [form, setForm]             = createSignal<CreateAdminUserDto>({
    email: '', role: 'viewer', display_name: '',
  });

  // Edit modal state
  const [editAdmin, setEditAdmin]           = createSignal<AdminUser | null>(null);
  const [editDisplayName, setEditDisplayName] = createSignal('');
  const [editRole, setEditRole]             = createSignal<AdminRole>('viewer');
  const [editActive, setEditActive]         = createSignal(true);
  const [editSaving, setEditSaving]         = createSignal(false);
  const [editError, setEditError]           = createSignal('');

  const [data, { refetch }] = createResource(
    page,
    (p) => adminUsersApi.list({ page: p, limit: 20 }).catch(() => null),
  );

  const openEdit = (admin: AdminUser, e: MouseEvent) => {
    e.stopPropagation();
    setEditAdmin(admin);
    setEditDisplayName(admin.display_name ?? '');
    setEditRole(admin.role);
    setEditActive(admin.is_active);
    setEditError('');
  };

  const handleEdit = async (e: Event) => {
    e.preventDefault();
    const admin = editAdmin();
    if (!admin) return;
    setEditSaving(true);
    setEditError('');
    try {
      await adminUsersApi.update(admin.uid, {
        display_name: editDisplayName().trim() || undefined,
        role:         editRole(),
        is_active:    editActive(),
      });
      setEditAdmin(null);
      refetch();
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to update admin user');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminUsersApi.create(form());
      setShowCreate(false);
      setForm({ email: '', role: 'viewer', display_name: '' });
      refetch();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this admin user? They will lose all admin access.')) return;
    await adminUsersApi.delete(uid);
    refetch();
  };

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Admin Users</h1>
          <p class="page-subtitle">{() => `${data()?.count ?? 0} total — manage who has access to this panel`}</p>
        </div>
        <button class="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Admin</button>
      </div>

      {/* Create modal */}
      <Dialog opened={showCreate} onToggle={(e)=>setShowCreate(e.opened)} showCloseIcon={true}>
        <Dialog.Content class='w-full max-w-lg'>
          <Dialog.Header class="modal-header">
              <h2 class="modal-title">Add Admin User</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-form w-full" onSubmit={handleCreate}>
              <div class="form-field">
                <label class="form-label">Email *</label>
                <input
                  class="form-input"
                  type="email"
                  required
                  value={form().email}
                  onInput={(e: InputEvent) =>
                    setForm(f => ({ ...f, email: (e.target as HTMLInputElement).value }))
                  }
                />
              </div>
              <div class="form-field">
                <label class="form-label">Display Name</label>
                <input
                  class="form-input"
                  type="text"
                  value={form().display_name ?? ''}
                  onInput={(e: InputEvent) =>
                    setForm(f => ({ ...f, display_name: (e.target as HTMLInputElement).value }))
                  }
                />
              </div>
              <div class="form-field">
                <label class="form-label">Role *</label>
                <select
                  class="form-input"
                  value={form().role}
                  onChange={(e: Event) =>
                    setForm(f => ({ ...f, role: (e.target as HTMLSelectElement).value as AdminRole }))
                  }
                >
                  {ADMIN_ROLES.map(r => (
                    <option value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p class="form-hint">
                  {() => {
                    const r = form().role;
                    const desc: Record<AdminRole, string> = {
                      superuser: 'Full access — can manage other admins and all platform features.',
                      admin:     'Manage users, OAuth clients and accounts. Cannot manage other admins.',
                      moderator: 'Can view and disable users. Read-only on other resources.',
                      viewer:    'Read-only access to all resources.',
                    };
                    return desc[r];
                  }}
                </p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button class="btn btn-primary" type="submit" disabled={creating()}>
                  {creating() ? 'Adding…' : 'Add Admin'}
                </button>
              </div>
            </form>
          </Dialog.Body>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Edit modal */}
      <Dialog opened={() => !!editAdmin()} onToggle={(e) => { if (!e.opened) setEditAdmin(null); }} showCloseIcon={true}>
        <Dialog.Content class='w-full max-w-lg'>
          <Dialog.Header class="modal-header">
            <h2 class="modal-title">Edit Admin User</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-form w-full" onSubmit={handleEdit}>
              {() => editError() && <p class="form-error">{editError()}</p>}
              <div class="form-field">
                <label class="form-label">Display Name</label>
                <input
                  class="form-input"
                  type="text"
                  value={editDisplayName()}
                  onInput={(e: InputEvent) => setEditDisplayName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-field">
                <label class="form-label">Role *</label>
                <select
                  class="form-input"
                  value={editRole()}
                  onChange={(e: Event) => setEditRole((e.target as HTMLSelectElement).value as AdminRole)}
                >
                  {ADMIN_ROLES.map(r => (
                    <option value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Status</label>
                <select
                  class="form-input"
                  value={() => editActive() ? 'active' : 'inactive'}
                  onChange={(e: Event) => setEditActive((e.target as HTMLSelectElement).value === 'active')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setEditAdmin(null)}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={editSaving()}>
                  {() => editSaving() ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Dialog.Body>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {() => {
        if (data.loading) return <div class="table-loading"><Spinner /></div>;
        const admins = data()?.data ?? [];
        if (!admins.length) return (
          <EmptyState
            icon="🛡"
            title="No admin users yet"
            message="Add your first admin to get started."
          />
        );

        return (
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr class="table-row" onClick={() => navigate(`/admin-users/${admin.uid}`)}>
                    <td class="cell-email">{admin.email}</td>
                    <td>{admin.display_name || '—'}</td>
                    <td>
                      <Badge variant={ROLE_COLORS[admin.role] as any}>{ROLE_LABELS[admin.role]}</Badge>
                    </td>
                    <td>
                      <Badge variant={admin.is_active ? 'success' : 'neutral'}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td class="cell-date">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td class="col-actions" onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <button
                        class="action-btn action-btn--edit"
                        onClick={(e: MouseEvent) => openEdit(admin, e)}
                        title="Edit admin"
                      >
                        ✏
                      </button>
                      <button
                        class="action-btn action-btn--danger"
                        onClick={(e: MouseEvent) => handleDelete(admin.uid, e)}
                        title="Remove admin"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div class="table-pagination">
              <button class="btn btn-sm btn-secondary" disabled={page() <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span class="pagination-info">Page {page()} of {data()?.totalPages ?? 1}</span>
              <button class="btn btn-sm btn-secondary" disabled={page() >= (data()?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        );
      }}
    </div>
  );
}
