import './styles.css';
import { startClient } from '@fluixi/core/client';
import App, { appRoutes } from './app.js';

// `#root`, matching index.html. Without it `startClient` looks for `#app`, finds nothing,
// and hydration never runs, so the page renders from the server and then responds to
// nothing.
startClient(App, { root: '#root', routes: appRoutes });
