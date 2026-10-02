import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
import { ColorSchemeProvider, Suspense } from '@fluixi/core';
import { routes } from '@fluixi/core/routes';

function RootLayout() {
  // Made per render: during prerender the head takes the scheme's attribute and its script.
  // `system` pins nothing, so the shared theme.css follows the OS until the reader chooses; the
  // pages are static, so the script applies a stored choice before paint. The bar colours are
  // theme.css's --bg, for the address bar on Android and Safari's bars on iOS.
  return (
    <ColorSchemeProvider storageKey="fluixi-docs-theme" systemAs="system" themeColor={{ light: '#ffffff', dark: '#0a0a0a' }}>
      <Suspense fallback={<div />}>
        <Outlet />
      </Suspense>
    </ColorSchemeProvider>
  );
}

export const appRoutes = [{ path: '/', component: RootLayout, children: routes as any }];

export default function App(props?: { url?: string }) {
  const history = typeof window === 'undefined' ? createMemoryHistory(props?.url ?? '/') : undefined;
  return <Router routes={appRoutes as any} history={history as any} />;
}
