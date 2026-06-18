// Client entry — hydrates the server-rendered markup in #root.
import { startClient } from '@fluixi/kettlejs/client';
import App from './app.js';

startClient(App);
