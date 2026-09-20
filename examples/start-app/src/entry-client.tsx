// Client entry: hydrates the server-rendered markup. The app HTML is injected into
// `#root` (the @fluixi/start mountId), so hydrate that container.
import { startClient } from '@fluixi/core/client';
import App from './app.js';

startClient(App, { root: '#root' });
