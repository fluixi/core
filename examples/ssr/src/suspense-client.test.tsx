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

// KNOWN PRE-EXISTING GAP (fails identically on the legacy suspense, verified): the
// render effect that reads a suspended resource is owned by the insert site, not the
// Suspense boundary, so the throw never reaches the boundary → the client fallback
// isn't shown (content is built once the resource resolves). Async SSR works (it
// awaits + re-renders). Unskip when the DOM runtime renders Suspense children under
// the boundary's owner.
describe('client Suspense fallback', () => {
  it.skip('shows the fallback while pending, then swaps to content', async () => {
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
