// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createResource, Suspense } from '@fluixi/core';
import { renderToString, renderToStringAsync } from '@fluixi/server';

// The idiomatic async pattern: read the resource directly (user() throws while
// pending, Suspense-style) inside a <Suspense> boundary.
function UserCard() {
  const [user] = createResource(
    () => new Promise<{ name: string }>((r) => setTimeout(() => r({ name: 'User #7' }), 5)),
  );
  return <p class="user">{user()!.name}</p>;
}
function App() {
  return (
    <main id="app">
      <Suspense fallback={<p class="user">loading…</p>}>
        <UserCard />
      </Suspense>
    </main>
  );
}

describe('server Suspense', () => {
  it('async render resolves the boundary to its content + serializes data', async () => {
    const html = await renderToStringAsync(() => App());
    expect(html).toContain('User #7'); // fallback → content
    expect(html).not.toContain('loading…');
    expect(html).toContain('__FX_DATA__'); // resolved data serialized for hydration
  });

  // Sync render (no await) shows the fallback: the resource is still pending, so the
  // boundary is in fallback and renderToString serializes the fallback markup. The
  // resource's settle is cancelled when the root disposes, so it never re-fires.
  it('sync render shows the fallback and does not hang', () => {
    expect(renderToString(() => App())).toContain('loading…');
  });
});
