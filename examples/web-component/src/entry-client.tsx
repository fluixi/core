// Client entry: hydrate the server-rendered page. The custom elements are registered by the
// imports in app.tsx, before hydration, which is fine: hydration adopts an element that has
// already upgraded and rendered its own content.
//
// `hydrate: true` because this app has no routes, and without them `startClient` renders from
// scratch: every server-rendered element was thrown away and built again.
import { startClient } from '@fluixi/core/client';
import App from './app.js';

startClient(App, { root: '#root', hydrate: true });
