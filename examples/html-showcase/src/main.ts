import { render } from '@fluixi/core';
import { html } from '@fluixi/core';
import { App } from './App';

// `<${App}/>` (dynamic tag) so TypeScript sees `App` referenced.
render(() => html`<App />`, document.getElementById('root')!);
