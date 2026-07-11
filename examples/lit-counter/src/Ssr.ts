import { createSignal, createResource, Suspense } from '@fluixi/core';
import { html } from '@fluixi/lit';

// An html``-authored app that exercises the higher-level framework features
// through the compiled template: async resources + <Suspense>. It renders on the
// server (renderToString) and the client, exactly like its JSX twin in
// examples/ssr — because html`` compiles to the same @fluixi/dom calls.

function fetchUser(id: number): Promise<{ name: string }> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ name: `User #${id}` }), 10),
  );
}

// Reads the resource's non-throwing getters (like the JSX SSR example) so sync
// renderToString serializes the fallback, async awaits the data.
function UserCard() {
  const [user] = createResource(() => fetchUser(7));
  const label = () => (user.loading ? 'loading…' : user.latest?.name ?? '');
  return html`<p class="user">${label()}</p>`;
}

// A component that throws-while-pending, rendered under <Suspense> — the compiled
// template must build the Suspense boundary the same way JSX does.
function AsyncName() {
  const [user] = createResource(() => fetchUser(9));
  return html`<span class="async">${user().name}</span>`;
}

export function SsrApp(props: { url?: string }) {
  const [count, setCount] = createSignal(3);
  return html`
    <main id="app">
      <h1>Fluixi SSR</h1>
      <p class="route">route: ${props.url ?? '/'}</p>
      <section class="counter">
        <button class="dec" @click=${() => setCount(count() - 1)}>-</button>
        <span class="value">${count()}</span>
        <button class="inc" @click=${() => setCount(count() + 1)}>+</button>
      </section>
      <UserCard />
      <Suspense fallback=${html`<span class="fb">loading name…</span>`}>
        <AsyncName />
      </Suspense>
    </main>
  `;
}
