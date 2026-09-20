import { Router, Outlet, createMemoryHistory, Link } from '@fluixi/start/router';
import { seo, JsonLD } from '@fluixi/start/head';
import { Suspense } from '@fluixi/core';
import { routes } from '@fluixi/core/routes';

/**
 * The shell every page renders inside.
 *
 * `seo()` here sets the defaults; a route that calls it again overrides only the fields
 * it names, so each page inherits the site title and social tags without repeating them.
 * The JSON-LD block is site-level and stays put across navigations.
 *
 * File routes are lazy, so the `<Outlet/>` sits under `<Suspense>`; async SSR resolves
 * their content on the server rather than shipping the fallback.
 */
function RootLayout() {
  seo({
    title: 'Ticket Desk',
    titleTemplate: '%s · Ticket Desk',
    description:
      'A support desk built on @fluixi/start, exercising dependency injection, middleware and server functions.',
    canonical: 'https://desk.example/',
  });

  return (
    <div class="app">
      <JsonLD
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Ticket Desk',
          url: 'https://desk.example/',
        }}
      />
      <header>
        <strong>Ticket Desk</strong>
        <nav>
          <Link href={"/"}>Home</Link>
          {' · '}
          <Link href={"/tickets"}>Tickets</Link>
          {' · '}
          <Link href={"/tickets/new"}>new</Link>
          {' · '}
          <Link href={"/admin"}>Admin</Link>
          {' · '}
          <Link href={"/about"}>About</Link>
          {' · '}
          <Link href={"/login"}>Sign in</Link>
        </nav>
      </header>
      <main>
        <Suspense fallback={<p>loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <footer>
        <small>
          Every response carries an <code>x-request-id</code> and a{' '}
          <code>server-timing</code> header, added by src/middleware.ts.
        </small>
      </footer>
    </div>
  );
}

const appRoutes = [{ path: '/', component: RootLayout, children: routes as any }];

export default function App(props?: { url?: string }) {
  // On the server, match the request URL with a memory history; the client defaults to
  // browser history.
  const history =
    typeof window === 'undefined' ? createMemoryHistory(props?.url ?? '/') : undefined;
  return <Router routes={appRoutes as any} history={history as any} />;
}
