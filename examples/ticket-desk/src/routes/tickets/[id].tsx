/**
 * One ticket, and the other DI scope.
 *
 * `provide()` here attaches a child injector to this component's reactive owner, so the
 * `DraftStore` lives exactly as long as the page is mounted. Navigate away and the
 * injector disposes, which runs `onDestroy` and drops the half-written reply, instead of
 * it reappearing on the next ticket, which is what a root-scoped draft would do.
 *
 * The draft's text is a signal, so the counter and the disabled button below both track
 * it without this component re-rendering as a whole.
 */
import { seo } from '@fluixi/start/head';
import { createResource, signal } from '@fluixi/reactive/signal';
import { Show } from '@fluixi/core';
import { inject, injectionToken, provide } from '@fluixi/start/di';
import { useParams } from '@fluixi/core/router';
import { DraftStore } from '../../services/draft-store.js';
import { loadDesk, type DeskSnapshot } from '../../actions.js';

const DraftToken = injectionToken<DraftStore>('Draft');

export default function TicketDetail() {
  // useParams returns an accessor, so it is called: `params().id`, not `params.id`.
  // Reading the property off the function itself yields undefined and every lookup
  // below silently misses.
  const params = useParams<{ id: string }>();
  const id = () => params().id;

  // Scoped to this component. The factory runs once per mount.
  provide([{ provide: DraftToken, useFactory: () => new DraftStore(id()) }]);
  const draft = inject(DraftToken);

  const [desk] = createResource<DeskSnapshot>(loadDesk);
  const ticket = () => desk.latest?.tickets.find((t) => t.id === id());

  const sent = signal<string | null>(null);

  seo({
    title: () => ticket()?.subject ?? 'Ticket',
    description: () => ticket()?.body ?? 'A support ticket.',
  });

  return (
    <section>
      {/* Three states, not two: until the resource settles there is nothing to say
          about whether the ticket exists. Collapsing that into the fallback reports a
          missing ticket during every load. */}
      <Show
        when={() => desk.latest}
        fallback={<p>loading…</p>}
      >
      <Show when={ticket} fallback={<p>No such ticket.</p>}>
        <h1>{() => ticket()!.subject}</h1>
        <p>
          <code>{() => ticket()!.id}</code> <StatusPill status={ticket()!.status} />{' '}
          opened by {() => ticket()!.author}
        </p>
        <p>{() => ticket()!.body}</p>

        <h2>Reply</h2>
        <textarea
          rows={4}
          cols={48}
          value={() => draft.text()}
          onInput={(e: Event) => draft.set((e.target as HTMLTextAreaElement).value)}
          placeholder="Type a reply, then navigate away and come back…"
        />
        <p>
          <small>{() => `${draft.length} characters`}</small>
        </p>
        <p>
          <button
            disabled={() => draft.isEmpty}
            onClick={() => {
              sent.set(draft.text());
              draft.clear();
            }}
          >
            Send
          </button>
        </p>
        <Show when={sent}>
          <p>
            <small>sent: {() => sent()}</small>
          </p>
        </Show>

        <p>
          <small>
            The draft is provided on this component, so leaving the page disposes it and
            clears the text. A root-scoped draft would follow you to the next ticket.
          </small>
        </p>
      </Show>
      </Show>
      <p>
        <a href="/tickets">← all tickets</a>
      </p>
    </section>
  );
}
