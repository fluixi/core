// Client entry: renders the app into `#root` (the @fluixi/start mountId). The server sends
// the page shell only (`ssr: false`); with `ssr: true` the same call hydrates instead.
import { startClient } from '@fluixi/core/client';
import App, { appRoutes } from './app.js';

// Passing the route tree lets startClient preload the matched route's lazy chunk before
// the first render, so the page does not wait for the router to boot to fetch it.
startClient(App, { root: '#root', routes: appRoutes });
