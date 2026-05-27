import { createMemo, createResource, createSignal } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { accountsApi } from '../../../infrastructure/api/accounts.api.js';
import { StatusBadge } from '../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { EmptyState } from '../../../shared/components/ui/EmptyState.js';
import type { Account } from '../../../domain/accounts/account.model.js';
import Dialog from '../../../shared/uid/webcomponents/dialog.jsx';

export default function AccountsPage() {
  const navigate = useNavigate();
  const [page, setPage]   = createSignal(1);
  const [search, setSearch] = createSignal('');

  // Create modal state
  const [showCreate, setShowCreate]   = createSignal(false);
  const [creating, setCreating]       = createSignal(false);
  const [createName, setCreateName]   = createSignal('');
  const [createOwner, setCreateOwner] = createSignal('');
  const [createPlan, setCreatePlan]   = createSignal('free');
  const [createError, setCreateError] = createSignal('');

  // Edit modal state
  const [editAccount, setEditAccount]   = createSignal<Account | null>(null);
  const [editName, setEditName]         = createSignal('');
  const [editOwner, setEditOwner]       = createSignal('');
  const [editPlan, setEditPlan]         = createSignal('free');
  const [editActive, setEditActive]     = createSignal(true);
  const [editSaving, setEditSaving]     = createSignal(false);
  const [editError, setEditError]       = createSignal('');

  const [data_, { refetch }] = createResource(
    () => ({ page: page(), search: search() }),
    ({ page: p, search: s }) =>
      accountsApi.list({ page: p, limit: 20, search: s || undefined }).catch(() => null),
  );
  const data = createMemo(() => data_());

  const openEdit = (account: Account, e: MouseEvent) => {
    e.stopPropagation();
    setEditAccount(account);
    setEditName(account.name);
    setEditOwner(account.owner_uid);
    setEditPlan(account.plan ?? 'free');
    setEditActive(account.is_active);
    setEditError('');
  };

  const handleEdit = async (e: Event) => {
    e.preventDefault();
    const account = editAccount();
    if (!account) return;
    setEditSaving(true);
    setEditError('');
    try {
      await accountsApi.update(account.id, {
        name:      editName().trim() || undefined,
        owner_uid: editOwner().trim() || undefined,
        plan:      editPlan() || undefined,
        is_active: editActive(),
      });
      setEditAccount(null);
      refetch();
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to update account');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    await accountsApi.delete(id);
    refetch();
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setCreateError('');
    const name = createName().trim();
    const owner_uid = createOwner().trim();
    if (!name) { setCreateError('Name is required'); return; }
    if (!owner_uid) { setCreateError('Owner UID is required'); return; }
    setCreating(true);
    try {
      await accountsApi.create({ name, owner_uid, plan: createPlan() });
      setShowCreate(false);
      setCreateName('');
      setCreateOwner('');
      setCreatePlan('free');
      refetch();
    } catch (err: any) {
      setCreateError(err?.message ?? 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Accounts</h1>
        <p class="page-subtitle">{() => `${data()?.count ?? 0} total`}</p>
        <button class="btn btn-primary" onClick={() => { setCreateError(''); setShowCreate(true); }}>
          + Add Account
        </button>
      </div>

      <div class="table-toolbar">
        <input
          class="search-input"
          type="search"
          placeholder="Search by name…"
          value={search()}
          onInput={(e: InputEvent) => {
            setSearch((e.target as HTMLInputElement).value);
            setPage(1);
          }}
        />
      </div>

      {() => {
        if (data_.loading) return <div class="table-loading"><Spinner /></div>;
        const accounts = data()?.data ?? [];
        if (!accounts.length) return <EmptyState title="No accounts found" />;

        return (
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Owner UID</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr class="table-row" onClick={() => navigate(`/accounts/${account.id}`)}>
                    <td class="cell-name">{account.name}</td>
                    <td class="cell-mono">{account.owner_uid}</td>
                    <td>{account.plan ?? 'free'}</td>
                    <td><StatusBadge active={account.is_active} /></td>
                    <td class="cell-date">{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—'}</td>
                    <td class="col-actions" onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <button
                        class="action-btn action-btn--edit"
                        onClick={(e: MouseEvent) => openEdit(account, e)}
                        title="Edit account"
                      >
                        ✏
                      </button>
                      <button
                        class="action-btn action-btn--danger"
                        onClick={() => handleDelete(account.id)}
                        title="Delete account"
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
              <h2 class="modal-title">Add Account</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-body w-full" onSubmit={handleCreate}>
              {() => createError() && <p class="form-error">{createError()}</p>}
              <div class="form-group">
                <label class="form-label">Account Name *</label>
                <input
                  class="form-input"
                  type="text"
                  required
                  value={createName()}
                  onInput={(e: InputEvent) => setCreateName((e.target as HTMLInputElement).value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Owner UID *</label>
                <input
                  class="form-input"
                  type="text"
                  required
                  value={createOwner()}
                  onInput={(e: InputEvent) => setCreateOwner((e.target as HTMLInputElement).value)}
                  placeholder="user uid"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Plan</label>
                <select
                  class="form-input"
                  value={createPlan()}
                  onChange={(e: Event) => setCreatePlan((e.target as HTMLSelectElement).value)}
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={creating()}>
                  {() => creating() ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </Dialog.Body>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Edit modal */}
      <Dialog opened={() => !!editAccount()} onToggle={(e) => { if (!e.opened) setEditAccount(null); }} showCloseIcon={true}>
        <Dialog.Content class='w-full max-w-lg'>
          <Dialog.Header class="modal-header">
            <h2 class="modal-title">Edit Account</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-body w-full" onSubmit={handleEdit}>
              {() => editError() && <p class="form-error">{editError()}</p>}
              <div class="form-group">
                <label class="form-label">Account Name *</label>
                <input
                  class="form-input"
                  type="text"
                  required
                  value={editName()}
                  onInput={(e: InputEvent) => setEditName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">Owner UID *</label>
                <input
                  class="form-input"
                  type="text"
                  required
                  value={editOwner()}
                  onInput={(e: InputEvent) => setEditOwner((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="form-group">
                <label class="form-label">Plan</label>
                <select
                  class="form-input"
                  value={editPlan()}
                  onChange={(e: Event) => setEditPlan((e.target as HTMLSelectElement).value)}
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div class="form-group">
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
                <button type="button" class="btn btn-secondary" onClick={() => setEditAccount(null)}>Cancel</button>
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
