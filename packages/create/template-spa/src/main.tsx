import { render } from '@fluixi/core';
import { App } from './app';

const root = document.getElementById('app');
if (root) render(() => <App />, root);
