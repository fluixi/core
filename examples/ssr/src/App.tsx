// Import both from the same barrel so the resource's signals live in the same
// reactive instance as the runtime's render effects.
import { createSignal, createResource } from '@fluixi/core';

/** Fake async data source: stands in for a real loader/fetch. */
function fetchUser(id: number): Promise<{ name: string }> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ name: `User #${id}` }), 10),
  );
}

/**
 * A nested component that reads an async resource. renderToStringAsync awaits the
 * fetch and re-renders this component's binding before serializing, so the
 * resolved data ends up in the server HTML, through the createComponent boundary.
 *
 * Read the resource's non-throwing getters (.loading / .latest) rather than
 * calling user(), which throws while pending (Suspense-style) and, without a
 * resolving server <Suspense>: would leave the slot empty.
 */
function UserCard() {
  const [user] = createResource(() => fetchUser(7));
  const label = () => (user.loading ? 'loading…' : user.latest?.name ?? '');
  return <p class="user">{label()}</p>;
}

/**
 * The app: a reactive counter + a nested async-data component, written in JSX and
 * compiled by the imperative backend. The same code renders on the server (to an
 * HTML string) and on the client (to live DOM). The SSR entry invokes the root as
 * a plain function (renderToString(() => App(props))), as @fluixi/server does.
 */
export function App(props: { url?: string }) {
  const [count, setCount] = createSignal(3);

  return (
    <main id="app">
      <h1>Fluixi SSR</h1>
      <p class="route">route: {props.url ?? '/'}</p>

      <section class="counter">
        <button class="dec" onClick={() => setCount(count() - 1)}>-</button>
        <span class="value">{count()}</span>
        <button class="inc" onClick={() => setCount(count() + 1)}>+</button>
      </section>

      <UserCard />
    </main>
  );
}
