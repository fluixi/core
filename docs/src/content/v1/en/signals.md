# Signals

A **signal** holds one piece of state that changes. Read it by calling it, write it with
`.set()`. Everything that read it updates: a text node, an attribute, a memo, an effect. Nothing
else runs again.

```ts
import { signal } from '@fluixi/reactive/signal';

const count = signal(0);

count();               // read  → 0
count.set(1);          // write → 1
count.set(c => c + 1); // update from the previous value → 2
```

Inside a start app, `$signal` is the same thing without the import: the compiler resolves it and
adds what it needs.

```ts
const count = $signal(0);
```

## A realistic example

A quantity picker for a cart line. Each signal is read where it is shown, so a click updates two
text nodes and one attribute, and the component function does not run again.

```tsx
function Quantity(props: { price: number; max: number }) {
  const qty = $signal(1);
  const atMax = () => qty() >= props.max;

  return (
    <div class="quantity">
      <button onClick={() => qty.set(q => Math.max(1, q - 1))}>-</button>
      <output>{qty()}</output>
      <button disabled={atMax()} onClick={() => qty.set(q => q + 1)}>+</button>
      <span>{(qty() * props.price).toFixed(2)} €</span>
    </div>
  );
}
```

`atMax` is a plain function: it costs nothing to create and is computed where it is read. When
several places read a derived value, or it is costly, make it a memo
([Derived values](/v1/en/derived-values)).

## Reading is tracking

Calling a signal inside a memo, an effect or a JSX expression **subscribes** that place to it. The
next write updates only the places that read it:

```ts
effect(() => {
  console.log('count is', count()); // subscribes to count
});
count.set(5); // logs "count is 5"
```

Reading outside any reactive place (in an event handler, at module level) just returns the value.

## Writing

Effects that read a signal run right after each write. Several writes in a row each flush their
effects, so group them with `batch` when they belong together:

```ts
import { batch } from '@fluixi/reactive/signal';

function reset() {
  batch(() => {
    query.set('');
    page.set(1);
    sort.set('name');
  }); // effects that read all three run once, here
}
```

An event handler does not batch for you.

## Equality

A write is skipped when the new value is `===` the old one (`Object.is`), so readers are not
notified for nothing. Pass `equals` to decide what counts as a change, or `equals: false` to
notify on every write:

```ts
const user = signal(initial, { equals: (a, b) => a.id === b.id && a.name === b.name });
const tick = signal(undefined, { equals: false }); // a trigger: every write notifies
```

## Reading without subscribing

`untrack` reads without creating a dependency:

```ts
import { untrack } from '@fluixi/reactive/signal';

effect(() => {
  draw(count(), untrack(theme)); // runs again on count, not on theme
});
```

`$untrack` is the same without the import.

## Where to use it, and where not

Use a signal for a value that changes and that the UI shows or depends on: a form field, a
selected tab, a counter, a toggle.

**Not for a value computed from other state.** An effect that writes a signal from other signals
runs one step late and can loop. Derive it:

```ts
// ✗ a copy kept in sync by hand
const total = signal(0);
effect(() => total.set(price() * qty()));

// ✓ derived
const total = memo(() => price() * qty());
```

**Not for an object or array changed in place.** The same reference fails the equality check, so
nothing updates:

```ts
// ✗ same array: no reader is notified
items.set(list => { list.push(item); return list; });

// ✓ a new array
items.set(list => [...list, item]);
```

For nested objects and lists edited key by key, a [store](/v1/en/stores) tracks each key on its
own.

**Not at module level for per-user state in a server-rendered app.** One module instance serves
every request on the server, so a signal declared at the top of a file is shared by all visitors.
Create it in a component, or keep per-request state in a
[service](/v1/en/dependency-injection) or the request's locals.

**Not created inside an effect or a memo.** Their body runs again on every change and builds a new
signal each time, losing the old value. Create signals once, in the component body.

## The tuple form

`createSignal` returns the same signal as a `[read, write]` pair:

```ts
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

count();       // read
setCount(1);   // write
```

It is one primitive with two spellings: `signal` is `createSignal` with the write function
attached as `.set`. They track each other, mix freely in a module, and behave the same through
server rendering and hydration. Prefer `signal`; the tuple is there for code ported from Solid
and for when you want the two halves apart.

## Under the hood

A signal is a node in a reactive graph that follows the shape of the TC39 Signals proposal. A
write marks the nodes that read it as dirty and pushes that mark down the graph; a memo
recomputes only when something reads it and one of its sources really changed. Effects are
flushed synchronously after the write (or at the end of a `batch`). The graph's state lives on
`globalThis`, so two copies of the package on one page share it. See
[TC39 signals](/v1/en/tc39-signals) for the lower-level API.

## Intrinsics

In an app built by `@fluixi/start`, the `$` forms need no import: the compiler rewrites each to
the runtime call and adds the import. They are not a second reactive system: `$signal` compiles
to `signal`. A local binding of the same name wins, and the compiler says so.

| Intrinsic | Stands for | Imported from |
| --- | --- | --- |
| `$signal`, `$memo`, `$effect` | `signal`, `memo`, `effect` | `@fluixi/reactive/signal` |
| `$resource` | `resource` | `@fluixi/reactive/signal` |
| `$cachedResource` | `cachedResource` | `@fluixi/reactive/cached-resource` |
| `$store`, `$untrackStore` | `store`, `untrackStore` | `@fluixi/reactive/store` |
| `$untrack`, `$batch`, `$root`, `$context` | `untrack`, `batch`, `root`, `context` | `@fluixi/reactive/signal` |
| `$cleanup` | `onCleanup` | `@fluixi/reactive/signal` |
| `$renderEffect`, `$computed` | `renderEffect`, `computed` | `@fluixi/reactive/signal` |
| `$selector`, `$deferred` | `createSelector`, `createDeferred` | `@fluixi/reactive/signal` |
| `$storage`, `$asyncStorage`, `$persisted` | `useStorage`, `useAsyncStorage`, `persisted` | `@fluixi/core/storage` |
| `$env` | `env` | `@fluixi/start/env` |
| `$html`, `$svg`, `$css` | `html`, `svg`, `css` | `@fluixi/core` |

Package code, which the start compiler does not process, imports the runtime names.

Next: **[Derived values](/v1/en/derived-values)**.
