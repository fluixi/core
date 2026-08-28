import { render } from 'fluixi';
import { html } from 'fluixi';
import { App } from './App';

// `<${App}/>` (dynamic tag) so TypeScript sees `App` referenced.
render(() => html`<App />`, document.getElementById('root')!);
