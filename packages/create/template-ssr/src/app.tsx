import { Router, Outlet, Link, createMemoryHistory } from '@fluixi/start/router';
import { Suspense } from '@fluixi/core';
import { routes } from '@fluixi/core/routes';

// Shell layout around the routed page. File-routes (src/routes/*) are lazy, so the
// <Outlet/> sits under <Suspense>: async SSR resolves their content server-side.
function RootLayout() {
  return (
    <div class="app">
      <nav>
        <Link href="/">home</Link>
        {' · '}
        <Link href="/about">about</Link>
      </nav>
      <main>
        <Suspense fallback={<p>loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

// Exported so entry-client can hand it to startClient, it preloads the current route's
// lazy chunk before hydrating, so the server-rendered DOM is adopted in place (flash-free).
export const appRoutes = [{ path: '/', component: RootLayout, children: routes as any }];

export default function App(props?: { url?: string }) {
  // On the server, match the request URL (memory history); on the client, default
  // to browser history.
  const history =
    typeof window === 'undefined'
      ? createMemoryHistory(props?.url ?? '/')
      : undefined;
  return <Router routes={appRoutes as any} history={history as any} />;
}
