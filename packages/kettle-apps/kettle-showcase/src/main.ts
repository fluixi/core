import { startClient } from '@awc/kettlejs/client';
import { html } from 'lit';
import App from './app';

const a = html`
    <a></a>
`

startClient(App, { root: '#root' });
