import { render } from '@fluixi/kettlejs';
import { hydrate } from '@fluixi/dom';
import { App } from './App';

// Client takeover.
// - With `pnpm serve` the server sent fully-rendered HTML → hydrate(): reuse the
//   existing DOM and wire events/reactivity in place (no re-render). Resolved
//   loader data is seeded from window.__FX_DATA__, so there's no refetch flash.
// - With `pnpm dev` the root is empty → render() from scratch.
const root = document.getElementById('root')!;
const wasServerRendered = root.querySelector('#app') !== null;

if (wasServerRendered) {
  console.log('[fluixi] server-rendered HTML present → hydrating');
  hydrate(<App url={location.pathname} />, root);
} else {
  console.log('[fluixi] no SSR content → client render');
  render(<App url={location.pathname} />, root);
}
