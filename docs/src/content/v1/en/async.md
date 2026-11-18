# Async data

A **resource** wraps asynchronous data, a fetch, a query, anything that returns a promise, in a
value that tracks its loading and error state:

```ts
import { signal, resource } from '@fluixi/reactive/signal';

const userId = signal(1);

const user = resource(userId, async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

user();      // the value, suspends under <Suspense>
user.loading;    // boolean
user.latest;     // last settled value, kept across a refetch
user.refetch();
```

`$resource` is the same without the import.

The first argument is a reactive **source**; whenever it changes, the fetcher re-runs with the new
value. Omit it to fetch once.

## Loading & error

A resource carries its state, so your UI can react to it:

```ts
user.loading; // true while fetching
user.error;   // the thrown error, if any
user();   // the resolved value (suspends while pending)
```

## Transitions

A change that makes a resource load again normally suspends it, and the nearest `Suspense` shows
its fallback until the new value arrives. Made inside `startTransition`, the change keeps the page
as it is instead: the resource reads as its current value until the new one is there.
`useTransition` says whether such a load is still running.

```ts
import { useTransition } from '@fluixi/reactive/signal';

const [isPending, startTransition] = useTransition();
// The current tab stays on screen, dimmed by isPending(), until the next one has loaded.
const open = (tab: string) => startTransition(() => setTab(tab));
```

`startTransition` returns a promise that settles once every load it started has. A resource
loading for the first time has no value to keep, so it suspends as usual.

## Server-side rendering

On the server, Fluixi **awaits** resources before serializing the HTML, then seeds the resolved
value into the page so the client hydrates without refetching, no loading flash, no waterfall.

```ts
// the same code renders on the server (awaited) and the client (streamed):
const posts = $resource(fetchPosts);
```

That is the end of the reactivity guide for **v1**. Explore it live in the
[Playground](https://playground.fluixi.com).

## The tuple form

`createResource` returns the same resource as `[resource, actions]`:

```ts
import { createResource } from '@fluixi/reactive/signal';

const [user, { refetch, mutate }] = createResource(userId, fetchUser);

user();        // the value
user.loading;
refetch();
```

`resource` is that pair folded together, `get` **is** the accessor `createResource`
returned, so suspending, tracking and SSR seeding are unchanged.
