// Admin. Guarded twice, on purpose.
//
// The middleware already returned 403 for a document request without the `admin` role,
// so a cold load of this URL never renders. `protectedRoute` covers the other path: a
// client-side navigation from an already-loaded tab, which never touches the server.
import { seo } from '@fluixi/start/head';
import { protectedRoute } from '../services/auth-hooks.js';
import { loadDesk, type DeskSnapshot } from '../actions.js';
import { createResource } from '@fluixi/reactive/signal';
import { For } from '@fluixi/core';

function Admin() {
  seo({ title: 'Admin', robots: 'noindex' });

  const [desk] = createResource<DeskSnapshot>(loadDesk);

  return (
    <section>
      <h1>Admin</h1>
      <p>
        Reached only with the <code>admin</code> role. A document request without it is
        stopped by the middleware with a 403; an in-app navigation is stopped here.
      </p>
      <RequestFacts
        viewer={desk.latest?.viewer ?? '…'}
        requestId={desk.latest?.requestId ?? '…'}
        servedBy={desk.latest?.servedBy ?? '…'}
      />
      <h2>All tickets, with internal notes</h2>
      <ul>
        <For each={() => desk.latest?.tickets ?? []}>
          {(t) => (
            <li>
              <code>{t.id}</code> {t.subject} <StatusPill status={t.status} />
              {t.internalNote ? <em> — {t.internalNote}</em> : null}
            </li>
          )}
        </For>
      </ul>
      <p>
        <small>
          The notes are absent after hydration: the server entry redacts{' '}
          <code>internalNote</code> out of the serialized payload, so they exist in the
          SSR markup but not in <code>__FX_DATA__</code>.
        </small>
      </p>
    </section>
  );
}

export default protectedRoute(Admin, { role: 'admin' });
