import './styles.css';
import { startClient } from 'fluixi/client';
import App, { appRoutes } from './app.js';

// Pass the route tree so startClient preloads the current route's lazy chunk before hydrating
// — the server-rendered DOM is then adopted in place (flash-free, no duplicate).
startClient(App, { root: '#root', routes: appRoutes });