import { createResource, createSignal } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { oauthClientsApi } from '../../../infrastructure/api/oauth-clients.api.js';
import { Badge } from '../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { EmptyState } from '../../../shared/components/ui/EmptyState.js';
import type { CreateOAuthClientDto, ClientType } from '../../../domain/oauth-clients/oauth-client.model.js';
import Dialog from '../../../shared/uid/webcomponents/dialog.jsx';

const EMPTY_FORM: CreateOAuthClientDto = {
  name:          '',
  redirect_uris: [],
  client_type:   'public',
  grant_types:   ['authorization_code', 'refresh_token'],
  scopes:        ['openid', 'profile', 'email'],
  client_uri:    '',
};

const CLIENT_TYPE_DESCRIPTIONS: Record<ClientType, string> = {
  public:       'Browser SPA or mobile app — cannot store a secret. Uses PKCE for security. No client_secret is generated.',
  confidential: 'Server-side app — can store a secret securely. A client_secret is generated and required on every token exchange.',
};

export default function OAuthClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = createSignal(1);
  const [showCreate, setShowCreate] = createSignal(false);
  const [creating, setCreating] = createSignal(false);
  const [form, setForm] = createSignal<CreateOAuthClientDto>({ ...EMPTY_FORM });

  const [data, { refetch }] = createResource(
    page,
    (p) => oauthClientsApi.list({ page: p, limit: 20 }).catch(() => null),
  );

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setCreating(true);
    try {
      await oauthClientsApi.create(form());
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      refetch();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this OAuth client? This cannot be undone.')) return;
    await oauthClientsApi.delete(id);
    refetch();
  };

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">OAuth Clients</h1>
          <p class="page-subtitle">{() => `${data()?.count ?? 0} total`}</p>
        </div>
        <button class="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Client</button>
      </div>

      <Dialog opened={showCreate} onToggle={(e)=>setShowCreate(e.opened)} showCloseIcon={true}>
        <Dialog.Content class='w-full max-w-lg'>
          <Dialog.Header class="modal-header">
              <h2 class="modal-title">Create OAuth Client</h2>
          </Dialog.Header>
          <Dialog.Body>
            <form class="modal-form w-full" onSubmit={handleCreate}>
              {/* ── Client Type ─────────────────────────────────────────── */}
              <div class="form-field">
                <label class="form-label">Client Type *</label>
                <div class="client-type-picker">
                  {(['public', 'confidential'] as ClientType[]).map(type => (
                    <button
                      type="button"
                      class={`client-type-card ${form().client_type === type ? 'client-type-card--active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, client_type: type }))}
                    >
                      <div class="client-type-card-header">
                        <strong>{type === 'public' ? 'Public' : 'Confidential'}</strong>
                        <Badge variant={type === 'public' ? 'brand' : 'success'}>
                          {type === 'public' ? 'No secret' : 'Has secret'}
                        </Badge>
                      </div>
                      <p class="client-type-card-desc">{CLIENT_TYPE_DESCRIPTIONS[type]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Name ────────────────────────────────────────────────── */}
              <div class="form-field">
                <label class="form-label">Name *</label>
                <input
                  class="form-input"
                  type="text"
                  required
                  value={form().name}
                  onInput={(e: InputEvent) =>
                    setForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))
                  }
                />
              </div>

              {/* ── Client URI ──────────────────────────────────────────── */}
              <div class="form-field">
                <label class="form-label">Client URI</label>
                <input
                  class="form-input"
                  type="url"
                  placeholder="https://myapp.example.com"
                  value={form().client_uri ?? ''}
                  onInput={(e: InputEvent) =>
                    setForm(f => ({ ...f, client_uri: (e.target as HTMLInputElement).value }))
                  }
                />
              </div>

              {/* ── Redirect URIs ───────────────────────────────────────── */}
              <div class="form-field">
                <label class="form-label">Redirect URIs (one per line) *</label>
                <textarea
                  class="form-input form-textarea"
                  rows={3}
                  required
                  placeholder="https://myapp.example.com/auth/callback"
                  value={form().redirect_uris.join('\n')}
                  onInput={(e: InputEvent) =>
                    setForm(f => ({
                      ...f,
                      redirect_uris: (e.target as HTMLTextAreaElement).value
                        .split('\n').map(s => s.trim()).filter(Boolean),
                    }))
                  }
                />
              </div>

              <div class="modal-footer">
                <button class="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button class="btn btn-primary" type="submit" disabled={creating()}>
                  {creating() ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </Dialog.Body>
          <Dialog.Footer></Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {() => {
        if (data.loading) return <div class="table-loading"><Spinner /></div>;
        const clients = data()?.data ?? [];
        if (!clients.length) return <EmptyState title="No OAuth clients" message="Create one to get started." />;

        return (
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client ID</th>
                  <th>Type</th>
                  <th>Grant Types</th>
                  <th>Created</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr class="table-row" onClick={() => navigate(`/oauth-clients/${client.id}`)}>
                    <td class="cell-name">{client.name}</td>
                    <td class="cell-mono">{client.client_id}</td>
                    <td>
                      <Badge variant={client.client_type === 'public' ? 'brand' : 'success'}>
                        {client.client_type ?? 'confidential'}
                      </Badge>
                    </td>
                    <td>{client.grant_types?.join(', ')}</td>
                    <td class="cell-date">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}</td>
                    <td class="col-actions" onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <button
                        class="action-btn action-btn--danger"
                        onClick={(e: MouseEvent) => handleDelete(client.id, e)}
                        title="Delete"
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
