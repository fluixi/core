import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
import { Suspense } from '@fluixi/core';
import { routes } from '@fluixi/core/routes';
import { seo } from '@fluixi/start/head';
import './styles.css';

function Shell() {
  seo({
    title: 'Auth flow debugger',
    description: 'One app against five OAuth2 providers, showing what each hands back.',
  });

  return (
    <div class="app">
      <Suspense fallback={<p class="muted">loading</p>}>
        <Outlet />
      </Suspense>
    </div>
  );
}

export const appRoutes = [{ path: '/', component: Shell, children: routes }];

export default function App(props?: { url?: string }) {
  // The request URL has to reach the memory history, or every server render matches `/`
  // and the page returned for any route is the index. The client uses browser history.
  const history =
    typeof window === 'undefined' ? createMemoryHistory(props?.url ?? '/') : undefined;
  return <Router routes={appRoutes} history={history as never} />;
}
