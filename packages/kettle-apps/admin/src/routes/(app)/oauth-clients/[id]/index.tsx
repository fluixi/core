import { createResource, createSignal } from '@awc/kettlejs';
import { useNavigate, useParams } from '@awc/kettlejs/router';
import { oauthClientsApi } from '../../../../infrastructure/api/oauth-clients.api.js';
import { StatusBadge } from '../../../../shared/components/ui/Badge.js';
import { Spinner } from '../../../../shared/components/ui/Spinner.js';

export default function OAuthClientDetailPage() {
  const params   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id       = () => params().id;
  const [newSecret, setNewSecret] = createSignal<string | null>(null);
  const [regenerating, setRegenerating] = createSignal(false);

  const [client, { refetch }] = createResource(id, (cid) =>
    oauthClientsApi.get(cid).catch(() => null),
  );

  const handleDelete = async () => {
    if (!confirm('Delete this OAuth client? This cannot be undone.')) return;
    await oauthClientsApi.delete(id());
    navigate('/oauth-clients', { replace: true });
  };

  const handleRegenerateSecret = async () => {
    if (!confirm('Regenerate the client secret? The old secret will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const res = await oauthClientsApi.regenerateSecret(id());
      setNewSecret(res.client_secret);
      refetch();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div class="page">
      <div class="page-header">
        <button class="back-btn" onClick={() => navigate('/oauth-clients')}>← OAuth Clients</button>
        <h1 class="page-title">Client Detail</h1>
      </div>

      {() => {
        if (client.loading) return <div class="page-loading"><Spinner /></div>;
        const c = client();
        if (!c) return <div class="page-error">Client not found.</div>;

        return (
          <div class="detail-layout">
            {() => newSecret() && (
              <div class="alert alert-warning">
                <strong>New client secret (copy now — it won't be shown again):</strong>
                <code class="secret-display">{newSecret()}</code>
                <button class="btn btn-sm btn-secondary" onClick={() => setNewSecret(null)}>Dismiss</button>
              </div>
            )}

            <div class="detail-card">
              <div class="detail-card-header">
                <div class="client-icon">🔑</div>
                <div class="user-header-info">
                  <h2>{c.name}</h2>
                  <p class="muted cell-mono">{c.client_id}</p>
                  <div class="user-badges">
                    <StatusBadge active={c.is_active} />
                  </div>
                </div>
                <div class="detail-actions">
                  <button
                    class="btn btn-warning"
                    onClick={handleRegenerateSecret}
                    disabled={regenerating()}
                  >
                    {regenerating() ? 'Regenerating…' : 'Regenerate Secret'}
                  </button>
                  <button class="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>

              <div class="detail-fields">
                <div class="detail-field">
                  <label class="field-label">ID</label>
                  <span class="field-value field-mono">{c.id}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Client ID</label>
                  <span class="field-value field-mono">{c.client_id}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Grant Types</label>
                  <span class="field-value">{c.grant_types.join(', ')}</span>
                </div>
                <div class="detail-field">
                  <label class="field-label">Scopes</label>
                  <span class="field-value">{c.scopes.join(', ')}</span>
                </div>
                <div class="detail-field detail-field--full">
                  <label class="field-label">Redirect URIs</label>
                  <ul class="uri-list">
                    {c.redirect_uris.map(uri => <li class="field-mono">{uri}</li>)}
                  </ul>
                </div>
                <div class="detail-field">
                  <label class="field-label">Created</label>
                  <span class="field-value">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </div>
  );
}
