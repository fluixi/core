import { Suspense, createContext, createProvider } from '@fluixi/core';
import { Router, lazy } from '@fluixi/core/router';

// Two transparent providers wrapping the router — mirrors a real app shell where
// the Router (and its lazy routes) live *inside* context providers.
const ThemeCtx = createContext<string>('light');
const LocaleCtx = createContext<string>('en');
const ThemeProvider = (p: any) => createProvider({ context: ThemeCtx, value: 'dark', children: p.children });
const LocaleProvider = (p: any) => createProvider({ context: LocaleCtx, value: 'fr', children: p.children });

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
