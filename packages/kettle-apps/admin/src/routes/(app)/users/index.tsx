import { createMemo, createResource, createSignal, useEffect } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { usersApi } from '../../../infrastructure/api/users.api.js';
import { StatusBadge } from '../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { EmptyState } from '../../../shared/components/ui/EmptyState.js';
import type { User } from '../../../domain/users/user.model.js';
import Dialog from '../../../shared/uid/webcomponents/dialog.jsx';

export default function UsersPage() {
  const navigate = useNavigate();
  const [page, setPage] = createSignal(1);
  const [search, setSearch] = createSignal('');

  // Create modal state
  const [showCreate, setShowCreate] = createSignal(false);
  const [creating, setCreating]     = createSignal(false);
  const [createEmail, setCreateEmail]             = createSignal('');
  const [createDisplayName, setCreateDisplayName] = createSignal('');
  const [createPassword, setCreatePassword]       = createSignal('');
  const [createError, setCreateError]             = createSignal('');

  // Edit modal state
  const [editUser, setEditUser]           = createSignal<User | null>(null);
  const [editDisplayName, setEditDisplayName] = createSignal('');
  const [editFirstName, setEditFirstName] = createSignal('');
  const [editLastName, setEditLastName]   = createSignal('');
  const [editPhone, setEditPhone]         = createSignal('');
  const [editRole, setEditRole]           = createSignal('');
  const [editSaving, setEditSaving]       = createSignal(false);
  const [editError, setEditError]         = createSignal('');

  const [data_, { refetch }] = createResource(
    () => ({ page: page(), search: search() }),
    ({ page: p, search: s }) =>
      usersApi.list({ page: p, limit: 20, search: s || undefined }).catch(() => null),
  );
  const data = createMemo(() => data_());

  const openEdit = (user: User, e: MouseEvent) => {
    e.stopPropagation();
    setEditUser(user);
    setEditDisplayName(user.display_name ?? '');
    setEditFirstName(user.first_name ?? '');
    setEditLastName(user.last_name ?? '');
    setEditPhone(user.phone_number ?? '');
    setEditRole(user.role ?? 'user');
    setEditError('');
  };

  const handleEdit = async (e: Event) => {
    e.preventDefault();
    const user = editUser();
    if (!user) return;
    setEditSaving(true);
    setEditError('');
    try {
      await usersApi.update(user.uid, {
        display_name:  editDisplayName().trim() || undefined,
        first_name:    editFirstName().trim() || undefined,
        last_name:     editLastName().trim() || undefined,
        phone_number:  editPhone().trim() || undefined,
        role:          editRole() || undefined,
      });
      setEditUser(null);
      refetch();
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggle = async (user: User) => {
    await (user.disabled ? usersApi.enable(user.uid) : usersApi.disable(user.uid));
    refetch();
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await usersApi.delete(uid);
    refetch();
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setCreateError('');
    const email = createEmail().trim();
    if (!email) { setCreateError('Email is required'); return; }
    setCreating(true);
    try {
      await usersApi.create({
        email,
        display_name: createDisplayName().trim() || undefined,
        password: createPassword().trim() || undefined,
      });
      setShowCreate(false);
      setCreateEmail('');
      setCreateDisplayName('');
      setCreatePassword('');
      refetch();
    } catch (err: any) {
      setCreateError(err?.message ?? 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Users</h1>
        <p class="page-subtitle">{() => `${data()?.count ?? 0} total`}</p>
        <button class="btn btn-primary" onClick={() => { setCreateError(''); setShowCreate(true); }}>
          + Add User
        </button>
      </div>

      <div class="table-toolbar">
        <input
          class="search-input"
          type="search"
          placeholder="Search by email…"
          value={search()}
          onInput={(e: InputEvent) => {
            setSearch((e.target as HTMLInputElement).value);
            setPage(1);
          }}
        />
      </div>

      {() => {
        if (data_.loading) return <div class="table-loading"><Spinner /></div>;
        const users = data()?.data ?? [];
        if (!users.length) return <EmptyState title="No users found" message="Try adjusting the search." />;

        return (
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Created</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr class="table-row" onClick={() => navigate(`/users/${user.uid}`)}>
                    <td class="cell-email">{user.email}</td>
                    <td>{user.display_name ?? '—'}</td>
                    <td><span class="role-badge">{user.role ?? 'user'}</span></td>
                    <td onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <button
                        class={`toggle-btn ${user.disabled ? 'toggle-btn--off' : 'toggle-btn--on'}`}
                        onClick={() => handleToggle(user)}
                        title={user.disabled ? 'Enable' : 'Disable'}
                      >
                        <StatusBadge active={!user.disabled} />
                      </button>
                    </td>
                    <td>{user.email_verified ? '✓' : '✗'}</td>
                    <td class="cell-date">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    <td class="col-actions" onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <button
                        class="action-btn action-btn--edit"
                        onClick={(e: MouseEvent) => openEdit(user, e)}
                        title="Edit user"
                      >
                        ✏
                      </button>
                      <button
                        class="action-btn action-btn--danger"
                        onClick={() => handleDelete(user.uid)}
                        title="Delete user"
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

      {/* Create modal */}
      <Dialog opened={showCreate} onToggle={(e)=>setShowCreate(e.opened)} showCloseIcon={true}>
        <Dialog.Content class='w-full max-w-lg'>
          <Dialog.Header class="modal-header">
              <h2 class="modal-title">Add User</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-body w-full" onSubmit={handleCreate}>
              {() => createError() && <p class="form-error">{createError()}</p>}
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input
                  class="form-input"
                  type="email"
                  required
                  value={createEmail()}
                  onInput={(e: InputEvent) => setCreateEmail((e.target as HTMLInputElement).value)}
                  placeholder="user@example.com"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Display Name</label>
                <input
                  class="form-input"
                  type="text"
                  value={createDisplayName()}
                  onInput={(e: InputEvent) => setCreateDisplayName((e.target as HTMLInputElement).value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input
                  class="form-input"
                  type="password"
                  value={createPassword()}
                  onInput={(e: InputEvent) => setCreatePassword((e.target as HTMLInputElement).value)}
                  placeholder="Leave blank to let user set password"
                />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={creating()}>
                  {() => creating() ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </Dialog.Body>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Edit modal */}
      <Dialog opened={() => !!editUser()} onToggle={(e) => { if (!e.opened) setEditUser(null); }} showCloseIcon={true}>
        <Dialog.Content class='w-full max-w-lg'>
          <Dialog.Header class="modal-header">
            <h2 class="modal-title">Edit User</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-body w-full" onSubmit={handleEdit}>
              {() => editError() && <p class="form-error">{editError()}</p>}
              <div class="form-group">
                <label class="form-label">Display Name</label>
                <input
                  class="form-input"
                  type="text"
                  value={editDisplayName()}
                  onInput={(e: InputEvent) => setEditDisplayName((e.target as HTMLInputElement).value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input
                  class="form-input"
                  type="text"
                  value={editFirstName()}
                  onInput={(e: InputEvent) => setEditFirstName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input
                  class="form-input"
                  type="text"
                  value={editLastName()}
                  onInput={(e: InputEvent) => setEditLastName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input
                  class="form-input"
                  type="tel"
                  value={editPhone()}
                  onInput={(e: InputEvent) => setEditPhone((e.target as HTMLInputElement).value)}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Role</label>
                <input
                  class="form-input"
                  type="text"
                  value={editRole()}
                  onInput={(e: InputEvent) => setEditRole((e.target as HTMLInputElement).value)}
                  placeholder="user"
                />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={editSaving()}>
                  {() => editSaving() ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Dialog.Body>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
