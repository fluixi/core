# Async data

A **resource** wraps asynchronous data — a fetch, a query, anything that returns a promise — in a
signal that tracks its loading and error state. Create one with `createResource`:

```ts
import { createSignal, createResource } from '@fluixi/reactive/signal';

const [userId, setUserId] = createSignal(1);

const [user] = createResource(userId, async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});
```

The first argument is a reactive **source**; whenever it changes, the fetcher re-runs with the new
value. Omit it to fetch once.

## Loading & error

The resource accessor carries its state, so your UI can react to it:

```ts
user.loading; // true while fetching
user.error;   // the thrown error, if any
user();       // the resolved value (suspends while pending)
```

## Server-side rendering

On the server, Fluixi **awaits** resources before serializing the HTML, then seeds the resolved
value into the page so the client hydrates without refetching — no loading flash, no waterfall.

```ts
// the same code renders on the server (awaited) and the client (streamed):
const [posts] = createResource(fetchPosts);
```

That is the end of the reactivity guide for **v1**. Explore it live in the
[Playground](https://playground.fluixi.com).
