import { render, html } from 'fluixi';
import { App } from './app';

const root = document.getElementById('app');
if (root) render(() => html`<${App} />`, root);
