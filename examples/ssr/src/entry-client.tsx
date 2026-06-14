import { render } from '@fluixi/kettlejs';
import { hydrate } from '@fluixi/dom';
import { App } from './App';

// Client takeover.
// - With `pnpm serve` the server sent fully-rendered HTML → hydrate(): reuse the
//   existing DOM and wire up events/reactivity in place (no re-render).
// - With `pnpm dev` the root is empty → render() from scratch.
//
// (The async user data is refetched on the client and briefly re-renders until
// resource-data transport lands — see the README follow-ups. The counter and
// static markup hydrate with no flash.)
const root = document.getElementById('root')!;
const wasServerRendered = root.querySelector('#app') !== null;

if (wasServerRendered) {
  console.log('[fluixi] server-rendered HTML present → hydrating');
  hydrate(() => <App url={location.pathname} />, root);
} else {
  console.log('[fluixi] no SSR content → client render');
  render(() => <App url={location.pathname} />, root);
}
