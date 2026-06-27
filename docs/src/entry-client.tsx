import './styles.css';
import { startClient } from '@fluixi/core/client';
import App from './app.js';

startClient(App, { root: '#root' });