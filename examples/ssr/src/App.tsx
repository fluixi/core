// Import both from the same barrel so the resource's signals live in the same
// reactive instance as the runtime's render effects.
import { createSignal, createResource } from '@fluixi/kettlejs';

/** Fake async data source — stands in for a real loader/fetch. */
function fetchUser(id: number): Promise<{ name: string }> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ name: `User #${id}` }), 10),
  );
}

/**
 * A real app (counter + async data) written in JSX, compiled by the imperative
 * backend. The same code renders on the server (to an HTML string) and on the
 * client (to live DOM).
 *
 * Note: the data resource is read here at the app root — the SSR entry invokes
 * the root as a plain function (renderToString(() => App(props))), so its
 * reactive bindings render correctly. (Reading a suspending resource inside a
 * nested <Component/> hits a separate, pre-existing imperative-backend bug, so
 * keep loader reads at the level the renderer invokes directly.)
 */
export function App(props: { url?: string }) {
  const [count, setCount] = createSignal(3);
  const [user] = createResource(() => fetchUser(7));
  // Derived accessor (a CallExpression → reactive binding). Read the resource's
  // non-throwing getters (.loading/.latest) rather than calling user(), which
  // throws while pending (Suspense-style) and would leave the slot empty under
  // a plain server render.
  const userLabel = () => (user.loading ? 'loading…' : user.latest?.name ?? '');

  return (
    <main id="app">
      <h1>Fluixi SSR</h1>
      <p class="route">route: {props.url ?? '/'}</p>

      <section class="counter">
        <button class="dec" onClick={() => setCount(count() - 1)}>-</button>
        <span class="value">{count()}</span>
        <button class="inc" onClick={() => setCount(count() + 1)}>+</button>
      </section>

      <p class="user">{userLabel()}</p>
    </main>
  );
}
