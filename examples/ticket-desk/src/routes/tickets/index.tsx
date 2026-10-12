// The ticket list. This is where DI and reactivity meet: the rows come from the
// request-scoped repository, and flipping a status re-renders only the row that changed.
import { seo } from '@fluixi/start/head';
import { createResource } from '@fluixi/reactive/signal';
import { For, Show } from '@fluixi/core';
import { action, ActionForm } from '@fluixi/core/router';
import { loadDesk, setTicketStatus, type DeskSnapshot } from '../../actions.js';

export default function Tickets() {
  seo({
    title: 'Tickets',
    description: 'Open, pending and closed tickets for the signed-in agent.',
  });

  const [desk, { mutate }] = createResource<DeskSnapshot>(loadDesk);

  // Calls the server function, then folds the returned snapshot back in so the list
  // updates without a second round trip.
  const move = action(async (data: { id?: string; status?: string }) => {
    const next = await setTicketStatus(data as never);
    mutate(() => next);
    return next;
  }, 'ticket-status');

  return (
    <section>
      <h1>Tickets</h1>
      <Show when={() => desk.latest} fallback={<p>loading…</p>}>
        <RequestFacts
          viewer={desk.latest!.viewer}
          requestId={desk.latest!.requestId}
          servedBy={desk.latest!.servedBy}
        />
      </Show>

      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>subject</th>
            <th>status</th>
            <th>move</th>
          </tr>
        </thead>
        <tbody>
          <For each={() => desk.latest?.tickets ?? []}>
            {(t) => (
              <tr>
                <td>
                  <a href={`/tickets/${t.id}`}>
                    <code>{t.id}</code>
                  </a>
                </td>
                <td>{t.subject}</td>
                <td>
                  <StatusPill status={t.status} />
                </td>
                <td>
                  <ActionForm action={move}>
                    <input type="hidden" name="id" value={t.id} />
                    <select name="status">
                      <option value="open">open</option>
                      <option value="pending">pending</option>
                      <option value="closed">closed</option>
                    </select>
                    <button type="submit">apply</button>
                  </ActionForm>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <p>
        <small>
          Only an agent may move a ticket. The check is in the server function, not in
          this form — the form is the part a caller can skip.
        </small>
      </p>
    </section>
  );
}
