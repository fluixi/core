import { createResource, Suspense } from 'fluixi';

function fetchUser(id: number): Promise<{ name: string }> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ name: `User #${id}` }), 10),
  );
}

function AsyncName() {
  const [user] = createResource(() => fetchUser(9));
  return <span class="async">{user().name}</span>;
}

// JSX twin of the lit-counter SsrApp's Suspense section — same shape, to check
// whether the SSR-hydration duplicate is lit-specific or a framework bug.
export function SuspenseApp(_props: { url?: string }) {
  return (
    <main id="app">
      <Suspense fallback={<span class="fb">loading…</span>}>
        <AsyncName />
      </Suspense>
    </main>
  );
}
