// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { flush } from '@fluixi/reactive/signal';
import { render } from '@fluixi/dom';
import { createResource, Suspense } from '@fluixi/core';

function UserCard() {
  const [user] = createResource(
    () => new Promise<{ name: string }>((r) => setTimeout(() => r({ name: 'User #7' }), 5)),
  );
  return <p class="user">{user()!.name}</p>;
}
function App() {
  return (
    <main id="app">
      <Suspense fallback={<p class="loading">loading…</p>}>
        <UserCard />
      </Suspense>
    </main>
  );
}

// Client-side Suspense: the fallback shows while a resource is pending, then swaps to
// content. Works because SuspenseImpl instantiates the children in their own effect
// under the boundary at setup, so the suspended read increments the boundary before
// the output's first show decision (see core/render/suspense.ts).
describe('client Suspense fallback', () => {
  it('shows the fallback while pending, then swaps to content', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(() => App(), container);
    await flush();

    expect(container.textContent).toContain('loading…');
    expect(container.textContent).not.toContain('User #7');

    await new Promise((r) => setTimeout(r, 20));
    await flush();

    expect(container.textContent).toContain('User #7');
    expect(container.textContent).not.toContain('loading…');
  });
});
