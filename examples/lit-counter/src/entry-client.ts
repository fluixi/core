import { render } from 'fluixi';
import { hydrate } from '@fluixi/dom';
import { html } from 'fluixi';
import { SsrApp } from './Ssr';

// Client takeover for the html``-authored app.
// - `pnpm serve`: the server sent fully-rendered HTML → hydrate() reuses the DOM
//   and wires events/reactivity in place (no re-render), then Suspense resolves.
// - `pnpm dev`: #root is empty → render() from scratch.
const root = document.getElementById('root')!;
const view = () => html`<SsrApp url=${location.pathname} />`;

if (root.querySelector('#app')) {
  hydrate(view(), root);
} else {
  render(view, root);
}
