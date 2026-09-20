// Client entry: hydrates the server-rendered markup. The app HTML is injected into
// `#root` (the @fluixi/start mountId), so hydrate that container.
import { startClient } from '@fluixi/core/client';
import App, { appRoutes } from './app.js';

// Passing the route tree lets startClient preload the matched route's lazy chunk before
// hydrating: the lazy file-route then resolves synchronously and adopts the server DOM in
// place (no first-paint flash, no duplicate). It also enables auto-hydration of the
// server-rendered root.
startClient(App, { root: '#root', routes: appRoutes });
