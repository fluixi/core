import { createMemo, createResource, createSignal } from '@awc/kettlejs';
import { tokensApi } from '../../../infrastructure/api/tokens.api.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { EmptyState } from '../../../shared/components/ui/EmptyState.js';
import type { OAuthToken } from '../../../domain/tokens/token.model.js';

export default function TokensPage() {
  const [page, setPage]   = createSignal(1);
  const [uid, setUid]     = createSignal('');
  const [client, setClient] = createSignal('');

  const [data_, { refetch }] = createResource(
    () => ({ page: page(), uid: uid(), client: client() }),
    ({ page: p, uid: u, client: c }) =>
      tokensApi.list({ page: p, limit: 20, uid: u || undefined, client_id: c || undefined }).catch(() => null),
  );
  const data = createMemo(() => data_());

  const handleRevoke = async (token: OAuthToken) => {
    if (!confirm(`Revoke token for user ${token.uid}?`)) return;
    await tokensApi.revoke(token.id);
    refetch();
  };

  const isExpired = (t: OAuthToken) => {
    if (!t.expired_at) return false;
    return new Date(t.expired_at) < new Date();
  };

  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">OAuth Tokens</h1>
        <p class="page-subtitle">{() => `${data()?.count ?? 0} total`}</p>
      </div>

      <div class="table-toolbar">
        <input
          class="search-input"
          type="search"
          placeholder="Filter by user UID…"
          value={uid()}
          onInput={(e: InputEvent) => { setUid((e.target as HTMLInputElement).value); setPage(1); }}
        />
        <input
          class="search-input"
          type="search"
          placeholder="Filter by client ID…"
          value={client()}
          onInput={(e: InputEvent) => { setClient((e.target as HTMLInputElement).value); setPage(1); }}
        />
      </div>

      {() => {
        if (data_.loading) return <div class="table-loading"><Spinner /></div>;
        const tokens = data()?.data ?? [];
        if (!tokens.length) return <EmptyState title="No tokens found" message="Try adjusting the filters." />;

        return (
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User UID</th>
                  <th>Client ID</th>
                  <th>Scope</th>
                  <th>Type</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr class="table-row">
                    <td class="cell-mono">{token.uid}</td>
                    <td class="cell-mono">{token.client_id}</td>
                    <td class="cell-scope">{token.scope ?? (token.scopes ?? []).join(' ')}</td>
                    <td>{token.token_type ?? 'Bearer'}</td>
                    <td class="cell-date">
                      {token.expired_at ? new Date(token.expired_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      {token.revoked
                        ? <span class="badge badge--danger">Revoked</span>
                        : isExpired(token)
                          ? <span class="badge badge--warning">Expired</span>
                          : <span class="badge badge--success">Active</span>
                      }
                    </td>
                    <td class="col-actions">
                      {!token.revoked && (
                        <button
                          class="action-btn action-btn--danger"
                          onClick={() => handleRevoke(token)}
                          title="Revoke token"
                        >
                          ✕
                        </button>
                      )}
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
