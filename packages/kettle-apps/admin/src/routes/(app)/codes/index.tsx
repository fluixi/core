import { createMemo, createResource, createSignal } from '@awc/kettlejs';
import { codesApi } from '../../../infrastructure/api/codes.api.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { EmptyState } from '../../../shared/components/ui/EmptyState.js';
import type { AuthCode } from '../../../domain/codes/code.model.js';

export default function CodesPage() {
  const [page, setPage]     = createSignal(1);
  const [uid, setUid]       = createSignal('');
  const [client, setClient] = createSignal('');

  const [data_, { refetch }] = createResource(
    () => ({ page: page(), uid: uid(), client: client() }),
    ({ page: p, uid: u, client: c }) =>
      codesApi.list({ page: p, limit: 20, uid: u || undefined, client_id: c || undefined }).catch(() => null),
  );
  const data = createMemo(() => data_());

  const handleDelete = async (code: AuthCode) => {
    if (!confirm(`Delete authorization code for user ${code.uid}?`)) return;
    await codesApi.delete(code.id);
    refetch();
  };

  const isExpired = (c: AuthCode) => {
    if (!c.expires) return false;
    return new Date(c.expires) < new Date();
  };

  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Authorization Codes</h1>
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
        const codes = data()?.data ?? [];
        if (!codes.length) return <EmptyState title="No authorization codes found" message="Try adjusting the filters." />;

        return (
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User UID</th>
                  <th>Client ID</th>
                  <th>Scope</th>
                  <th>Redirect URI</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr class="table-row">
                    <td class="cell-mono">{code.uid}</td>
                    <td class="cell-mono">{code.client_id}</td>
                    <td class="cell-scope">{code.scope ?? (code.scopes ?? []).join(' ')}</td>
                    <td class="cell-mono">{code.redirect_uri ?? '—'}</td>
                    <td class="cell-date">
                      {code.expires ? new Date(code.expires).toLocaleString() : '—'}
                    </td>
                    <td>
                      {code.used
                        ? <span class="badge badge--secondary">Used</span>
                        : isExpired(code)
                          ? <span class="badge badge--warning">Expired</span>
                          : <span class="badge badge--success">Active</span>
                      }
                    </td>
                    <td class="col-actions">
                      <button
                        class="action-btn action-btn--danger"
                        onClick={() => handleDelete(code)}
                        title="Delete code"
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
