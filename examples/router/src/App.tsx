import { Suspense, createContext, createProvider } from '@fluixi/core';
import { Router, lazy } from '@fluixi/core/router';

// Two transparent providers wrapping the router — mirrors a real app shell where
// the Router (and its lazy routes) live *inside* context providers.
const ThemeCtx = createContext<string>('light');
const LocaleCtx = createContext<string>('en');
const ThemeProvider = (p: any) => createProvider(ThemeCtx, 'dark', p);
const LocaleProvider = (p: any) => createProvider(LocaleCtx, 'fr', p);

const routes = [{ path: '/', component: lazy(() => import('./pages/home.js')) }];

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <Suspense fallback={<div class="loading">Loading…</div>}>
          <Router routes={routes} />
        </Suspense>
      </ThemeProvider>
    </LocaleProvider>
  );
}
