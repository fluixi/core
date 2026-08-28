import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
import { Suspense } from 'fluixi';
import { routes } from 'fluixi/routes';

// Shell layout around the routed page. File-routes (src/routes/*) are lazy, so the
// <Outlet/> sits under <Suspense> — async SSR resolves their content server-side.
function RootLayout() {
  return (
    <div class="app">
      <nav>
        <a href="/">home</a>
        {' · '}
        <a href="/about">about</a>
        {' · '}
        <a href="/guestbook">guestbook</a>
      </nav>
      <main>
        <Suspense fallback={<p>loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

const appRoutes = [{ path: '/', component: RootLayout, children: routes as any }];

export default function App(props?: { url?: string }) {
  // On the server, match the request URL (memory history); on the client, default
  // to browser history.
  const history =
    typeof window === 'undefined'
      ? createMemoryHistory(props?.url ?? '/')
      : undefined;
  return <Router routes={appRoutes as any} history={history as any} />;
}
