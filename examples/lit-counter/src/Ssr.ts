import { createSignal, createResource } from '@fluixi/core';
import { html } from '@fluixi/core';

// An html``-authored app that exercises SSR + async resources + hydration through
// the compiled template. It renders on the server (renderToString) and hydrates on
// the client, exactly like the JSX examples/ssr app — because html`` compiles to
// the same @fluixi/dom calls.
//
// Resources are read GUARDED by user.loading: `user.loading ? … : user().name`.
// Calling user() only when NOT loading means it never throws (a bare user() while
// pending suspends). This is the SSR pattern that hydrates cleanly — sync
// renderToString serializes the loading text, async awaits the data, and hydration
// adopts the server text in place.

function fetchUser(id: number): Promise<{ name: string }> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ name: `User #${id}` }), 10),
  );
}

function UserCard() {
  const [user] = createResource(() => fetchUser(7));
  const label = () => (user.loading ? 'loading…' : user().name);
  return html`<p class="user">${label()}</p>`;
}

// Renders an EMPTY string while loading — a case that used to duplicate on
// hydration (the server rendered content, the client rendered '' during the brief
// load, orphaning the server node). Now hydrates in place.
// Accepts a reactive `titlXe` prop and forwards it. NOTE: read it as `props.title`,
// never destructure (`const { title } = props`) — props are getters, so
// destructuring reads the value ONCE and freezes it (that's why the bare
// `.title=${`…${count()}`}` looked non-reactive). Accessing `props.title` inside
// the template re-reads the getter, so it stays reactive with either form.
function AsyncName(props: { title?: string }) {
  const [user] = createResource(() => fetchUser(9));
  const nm = () => (user.loading ? '' : user().name ?? '');
  return html`<span class="async">${props.title}: ${nm()}</span>`;
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
      <div if=${count() === 3}>is 3</div>
      <div else>not 3</div>
      <div if=${count() > 3}>above 3</div>
      <div if=${count() > 5}>above 5</div>
      <UserCard />
      <AsyncName .title=${`test props ${count()}`} />
    </main>
  `;
}
