# Async data

A **resource** turns something asynchronous (a fetch, a query, anything that returns a promise)
into a value the page can read, with its loading and error state:

```ts
import { signal, resource } from '@fluixi/reactive/signal';

const userId = signal(1);

const user = resource(userId, async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

user();          // the value; reading it while loading suspends the nearest <Suspense>
user.loading;    // true while a fetch runs
user.error;      // the failure, once it failed
user.latest;     // the last value that arrived, kept during a refetch: never suspends
user.state;      // 'unresolved' | 'pending' | 'ready' | 'refreshing' | 'errored'
user.refetch();  // fetch again with the same source
user.mutate(v);  // set the value directly (an optimistic update)
```

`$resource` is the same without the import.

The first argument is a reactive **source**: whenever it changes, the fetcher runs again with the
new value, and a newer fetch wins over an older one still in flight. Omit it to fetch once.

Data a page needs before it shows belongs in the route's `routeData`
([Routing](/v1/en/routing)); a resource is for data a component loads for itself.

## A realistic example

A user card that loads its user, shows a placeholder while loading and a retry on failure:

```tsx
function UserCard(props: { id: string }) {
  const user = $resource(() => props.id, (id) => fetch(`/api/users/${id}`).then((r) => r.json()));

  return (
    <ErrorBoundary fallback={(err, reset) => (
      <p>Could not load the user. <button onClick={() => { user.refetch(); reset(); }}>Retry</button></p>
    )}>
      <Suspense fallback={<div class="card skeleton" />}>
        <article class="card">
          <h3>{user()?.name}</h3>
          <p>{user()?.email}</p>
        </article>
      </Suspense>
    </ErrorBoundary>
  );
}
```

Changing `props.id` fetches the new user, and the skeleton shows again until it arrives.

## Suspense: what shows while loading

`<Suspense fallback={...}>` shows its fallback while any resource read below it is loading, and
its content once all of them are in. Put one around each region that should appear at once; two
regions that load separately get two boundaries.

A refetch brings the fallback back. To keep the current content on screen instead:

- read `user.latest` where the previous value is fine to show: it never suspends;
- or make the change inside a transition (below).

`SuspenseList` orders sibling boundaries: `revealOrder="forwards"` shows them top to bottom even
when the network answers out of order, and `tail="collapsed"` shows only the next fallback. Use it
for feeds and dashboards that would otherwise jump.

## ErrorBoundary: what shows when something fails

`<ErrorBoundary fallback={(error, reset) => ...}>` catches what a component, an effect or a
resource below it throws, and shows the fallback instead; `reset()` renders the children again.
Put one around each region that can fail on its own, and one around the routes in the root layout.
Without any, the error is uncaught: in the console in the browser, a `500` for a server render.

## Transitions

A change made inside `startTransition` keeps the page as it is while the loads it causes run: a
resource reloading because of it keeps returning its current value instead of suspending.
`useTransition` says whether such a load is still running:

```ts
import { useTransition } from '@fluixi/reactive/signal';

const [isPending, startTransition] = useTransition();
// The current tab stays on screen, dimmed by isPending(), until the next one has loaded.
const open = (next: string) => startTransition(() => tab.set(next));
```

`startTransition` returns a promise that settles once every load it started has. A resource loading
for the first time has no value to keep, so it suspends as usual.

## Where to use it, and where not

| You need | Use |
|---|---|
| data the page needs before it shows | the route's `routeData`, with `cache()` |
| data a widget loads for itself | a resource, inside its own `Suspense` |
| data several components read | `cachedResource` with a key, or `cache()` ([Caching](/v1/en/caching)) |
| the page kept on screen while a filter reloads it | `startTransition`, or `.latest` |
| a write to the server | a server function or an action, not a resource |

**Not `fetch` in an effect or in `onMount`.** You lose the loading and error state, the server
render does not wait for it, and the browser fetches again after hydration.

**Not created conditionally.** On the server, each resource's value is sent with the page and
picked up by position in the browser. A resource created on one side only (behind a browser check)
shifts every one after it. Create resources unconditionally, in the same order on both sides.

**Not for secrets.** Everything a resource returns is serialized into the page. Return only what
the page shows.

## On the server

On the server, Fluixi **waits** for every resource a render started before writing the HTML, then
sends the values with the page, so the browser hydrates without fetching again: no loading flash,
no waterfall. The head goes out first; the body follows in one piece once every resource has
loaded, so the slowest one decides when the page appears. Content is not streamed in as each
resource settles.

```ts
// the same code renders on the server (awaited) and in the browser (seeded, no refetch):
const posts = $resource(fetchPosts);
```

## Under the hood

A resource is a few signals (value, error, state, the current promise) and one effect that watches
the source and starts the fetch. Reading the resource while it loads throws its promise, which the
nearest `Suspense` catches and counts until it settles; a failure throws the error to the nearest
`ErrorBoundary`. Each resource takes the next id in the render, which is how the browser finds the
value the server sent for it.

## The tuple form

`createResource` returns the same resource as `[resource, actions]`:

```ts
import { createResource } from '@fluixi/reactive/signal';

const [user, { refetch, mutate }] = createResource(userId, fetchUser);

user();        // the value
user.loading;
refetch();
```

`resource` is that pair folded into one handle: the accessor `createResource` returns, with
`refetch` and `mutate` attached, so suspending, tracking and server seeding are the same.

Explore it live in the [Playground](https://playground.fluixi.com).
