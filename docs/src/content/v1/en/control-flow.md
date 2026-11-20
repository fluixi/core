# Control flow

A component runs once, so a plain `if` in its body is decided once and never again. Conditions and
lists that change go through control-flow components: they keep what stays, and build or remove
only what changed.

In an app built by `@fluixi/start`, `Show`, `For`, `Index`, `Switch`, `Match`, `Dynamic` and
`Portal` need no import; elsewhere, and for `ClientOnly` everywhere, import them from
`@fluixi/core`.

## Show

One condition:

```tsx
<Show when={user()} fallback={<a href="/login">Sign in</a>}>
  <p>Welcome back</p>
</Show>
```

When the children need the value, pass a function; it receives the value, already checked:

```tsx
<Show when={user()}>{(u) => <p>Welcome back, {u.name}</p>}</Show>
```

Plain children are built once while the condition stays true. A function child runs again each
time `when` becomes a **different** truthy value (a new object), and builds a new branch.

## Switch and Match

Several exclusive branches; the first `Match` whose `when` is truthy wins:

```tsx
<Switch fallback={<p>Unknown status</p>}>
  <Match when={order().status === 'paid'}><Paid /></Match>
  <Match when={order().status === 'shipped'}><Shipped /></Match>
  <Match when={order().status === 'refunded'}><Refunded /></Match>
</Switch>
```

## For

A list of objects. The row function runs once per item; when the list changes, rows are added,
removed and moved, not rebuilt:

```tsx
<For each={todos()} fallback={<p>Nothing to do</p>}>
  {(todo, i) => <li>{i() + 1}. {todo.title}</li>}
</For>
```

By default an item is matched by its object reference. Data refetched from an API arrives as new
objects every time, which would rebuild every row; give `by` a key, and the same key keeps its row,
its DOM and its focus. With `by`, the item is an accessor, since its contents can change under the
same key:

```tsx
<For each={todos()} by={(t) => t.id}>
  {(todo) => <li class={todo().done ? 'done' : ''}>{todo().title}</li>}
</For>
```

## Index

A list where the position matters more than the item: primitives, a fixed set of slots, a grid.
Each slot is built once, and the item at that position is an accessor that changes:

```tsx
<Index each={scores()}>
  {(score, i) => <td>{i + 1}: {score()}</td>}
</Index>
```

## Dynamic

When the component or the tag itself changes:

```tsx
const views = { grid: GridView, list: ListView };
<Dynamic component={views[mode()]} items={items()} />
<Dynamic component={level() === 1 ? 'h1' : 'h2'}>{title()}</Dynamic>
```

A new prop updates the current component in place; a new component or tag replaces it.

## ClientOnly

A subtree that cannot render on the server (it reads `window`, `localStorage`, the time zone). The
server and the hydration render `fallback`; the children are built in the browser right after:

```tsx
import { ClientOnly } from '@fluixi/core';

<ClientOnly fallback={<div class="map-placeholder" />}>
  <Map center={center()} />
</ClientOnly>
```

## Portal

Renders somewhere else in the document, a dialog or a tooltip, while it stays part of the
component that owns it: its context, and its cleanup when that component goes.

```tsx
<Portal mount={document.getElementById('modal-root')!}>
  <Dialog />
</Portal>
```

Without `mount` it goes at the end of `document.body`. On the server a portal renders nothing; in
the browser its content mounts once the page has hydrated.

## On an element

The same branches and lists can sit on an element as attributes, `if`, `else`, `each` and `key`, or
on `<container>` when no element should be added. The compiler turns them into the components
above. See [Control flow in directives](/v1/en/directives#control-flow).

```tsx
<ul each={rows()}>{(row: Row) => <li>{row.name}</li>}</ul>
<p if={user()}>Welcome back</p>
<container else><a href="/login">Sign in</a></container>
```

On a lowercase tag TypeScript cannot infer the item, so annotate it, or use `<For>` where the type
should be inferred.

## Where to use which, and what not to write

| You have | Use |
|---|---|
| one condition | `Show` |
| several exclusive cases | `Switch` / `Match` |
| a list of objects | `For`, with `by` when the objects are recreated |
| primitives or fixed slots | `Index` |
| a component or tag chosen at run time | `Dynamic` |
| browser-only content | `ClientOnly` |
| content placed elsewhere in the page | `Portal` |

**Not `cond() && <X />` for anything with state or cost.** The expression is one reactive
insertion: each time it runs again, even while the condition stays true, it disposes `X` and builds
it again, cleanups included.

```tsx
// ✗ rebuilt whenever n changes, though it stays positive
{n() > 0 && <Badge count={n()} />}
// ✓ built once while the condition holds; the count updates in place
<Show when={n() > 0}><Badge count={n()} /></Show>
```

**Not `.map()` for a list that changes.** It rebuilds every row on each change:

```tsx
// ✗ every row rebuilt when one is added
{todos().map((t) => <li>{t.title}</li>)}
// ✓ only the new row is built
<For each={todos()} by={(t) => t.id}>{(t) => <li>{t().title}</li>}</For>
```

**Not an early `return` in the component body.** It runs once:

```tsx
// ✗ decided once: logging in later never shows the dashboard
if (!user()) return <Login />;
// ✓
<Show when={user()} fallback={<Login />}><Dashboard /></Show>
```

**Not a callback as `when`.** `when` accepts a function as an accessor and calls it; to test
whether a callback was passed, use `when={!!props.onClose}`.

## Under the hood

Each control-flow component is a memo over its condition or list. `Show` and `Switch` build a
branch under its own owner and dispose that owner when the branch changes. `For` keeps a map from
item (or key) to row, and on each change works out the rows to add, remove and move, so DOM nodes
for unchanged rows are moved, never recreated; `Index` keeps one row per position and updates the
item signal of each. All of them are server-rendered and adopted by hydration in place.

Next: **[Lifecycle](/v1/en/lifecycle)**.
