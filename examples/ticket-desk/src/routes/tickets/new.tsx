// Opening a ticket. Behind the middleware guard (a document request without a session
// redirects to /login) and behind protectedRoute (an in-app navigation does the same).
import { seo } from '@fluixi/start/head';
import { signal } from '@fluixi/reactive/signal';
import { action, Form } from '@fluixi/core/router';
import { protectedRoute } from '../../services/auth-hooks.js';
import { openTicket } from '../../actions.js';

function NewTicket() {
  seo({ title: 'Open a ticket' });

  const error = signal<string | null>(null);

  const submit = action(async (data: { subject?: string; body?: string }) => {
    error.set(null);
    try {
      await openTicket(data);
      if (typeof window !== 'undefined') window.location.assign('/tickets');
    } catch (e) {
      // The server function rejects an anonymous or empty submission; show why.
      error.set(e instanceof Error ? e.message : String(e));
    }
  }, 'open-ticket');

  return (
    <section>
      <h1>Open a ticket</h1>
      <Form action={submit}>
        <p>
          <input name="subject" placeholder="Subject" size={48} />
        </p>
        <p>
          <textarea name="body" placeholder="What happened?" rows={4} cols={48} />
        </p>
        <button type="submit">Open</button>
      </Form>
      <p style={{ color: '#b42318' }}>{() => error() ?? ''}</p>
    </section>
  );
}

export default protectedRoute(NewTicket);
