import { render } from '@fluixi/kettlejs';
import { App } from './App';

// Client takeover. With `pnpm serve` the server already sent fully-rendered
// HTML (first paint / SEO / works with JS disabled); with `pnpm dev` the root
// is empty and the client renders from scratch. This log makes the difference
// observable in the console.
const root = document.getElementById('root')!;
const wasServerRendered = root.querySelector('#app') !== null;
console.log(
  wasServerRendered
    ? '[fluixi] server-rendered HTML present → client taking over'
    : '[fluixi] no SSR content → client-only render',
);

// NOTE: render() currently clears + rebuilds (true DOM-reuse hydration is a
// tracked follow-up). Swap for hydrate() once that lands.
render(() => <App url={location.pathname} />, root);
