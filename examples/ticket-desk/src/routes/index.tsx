// The landing page. Prerendered at build time (see `prerender` in fluixi.config.ts),
// which is why it reads nothing request-scoped.
import { seo } from '@fluixi/start/head';
import { Link } from '@fluixi/start/router';

export default function Home() {
  seo({
    title: 'Home',
    description: 'A support desk that exercises the @fluixi/start feature set.',
  });

  return (
    <section>
      <h1>Ticket Desk</h1>
      <p>
        A working support desk, built to exercise the parts of <code>@fluixi/start</code>{' '}
        that are easy to claim and hard to prove.
      </p>
      <ul>
        <li>
          <Link href={"/tickets"}>Tickets</Link> — dependency injection resolving a request-scoped
          repository, with reactive reads.
        </li>
        <li>
          <Link href={"/tickets/new"}>Open a ticket</Link> — behind the auth guard in the
          middleware chain.
        </li>
        <li>
          <Link href={"/admin"}>Admin</Link> — role-gated; returns 403 without the role.
        </li>
        <li>
          <code>/api/tickets</code>, <code>/api/tickets/:id</code>,{' '}
          <code>/api/whoami</code>, <code>/api/health</code> — file-based API routes.
        </li>
      </ul>
    </section>
  );
}
