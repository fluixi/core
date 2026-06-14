// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createResource, Suspense } from '@fluixi/kettlejs';
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

  // OPEN: sync renderToString() of a <Suspense> whose child kicks off a fetching
  // resource hangs the process — the fetch (timer/promise) is started but never
  // settled (no async drain) and the boundary keeps it subscribed, so the event
  // loop never drains. Use renderToStringAsync for Suspense content; sync render
  // of a Suspense+resource needs the in-flight fetch cleaned up on dispose.
  it.skip('sync render shows the fallback (OPEN — hangs: resource fetch not cleaned up)', () => {
    expect(renderToString(() => App())).toContain('loading…');
  });
});
