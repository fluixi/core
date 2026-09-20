// Static content, prerendered alongside the landing page.
import { seo } from '@fluixi/start/head';

export default function About() {
  seo({
    title: 'About',
    description: 'How this example is put together.',
    canonical: 'https://desk.example/about',
  });

  return (
    <section>
      <h1>About this example</h1>
      <p>
        Each feature here is load-bearing rather than demonstrated in isolation. The
        repository is request-scoped because a singleton would leak one user's tickets to
        another; the guard short-circuits because rendering a page the caller may not see
        is wasted work and a disclosure risk.
      </p>
      <h2>What the tests assert</h2>
      <ul>
        <li>
          <code>tests/di.spec.ts</code> — two concurrent requests get separate
          repositories, aliases resolve to one instance, cycles are reported.
        </li>
        <li>
          <code>tests/middleware.spec.ts</code> — the guard stops the chain before SSR
          runs, and wrapping layers still tag the response it returned.
        </li>
        <li>
          <code>tests/reactivity.spec.ts</code> — a component reading the repository
          re-renders when a ticket changes.
        </li>
        <li>
          <code>tests/api.spec.ts</code> — the file routes enforce roles and return the
          right status codes.
        </li>
      </ul>
    </section>
  );
}
