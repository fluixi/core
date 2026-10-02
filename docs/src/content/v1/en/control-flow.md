# Control flow

Use control-flow components instead of raw `if`/`map` in markup, they keep updates fine-grained
and only touch the DOM that changed.

## Show

Conditionally render a branch:

```tsx
import { Show } from '@fluixi/core';

<Show when={user()} fallback={<a href="/login">Sign in</a>}>
  <p>Welcome back, {user()!.name}</p>
</Show>;
```

## For

Render a list, keyed by reference, so rows are moved rather than re-created:

```tsx
import { For } from '@fluixi/core';

<For each={items()}>
  {(item) => <li>{item.label}</li>}
</For>;
```

Use `Index` instead when you key by position rather than identity.

## Switch / Match

For multiple exclusive branches:

```tsx
import { Switch, Match } from '@fluixi/core';

<Switch fallback={<NotFound />}>
  <Match when={route() === 'home'}><Home /></Match>
  <Match when={route() === 'about'}><About /></Match>
</Switch>;
```

## On an element

The same branches and lists can sit on an element as attributes, `if`, `else`, `each` and `key`,
or on `<container>` when no element should be added. The compiler turns them into the components
above. See [Control flow in directives](/v1/en/directives#control-flow).

```tsx
<ul each={rows()}>{(row: Row) => <li>{row.name}</li>}</ul>
<p if={user()}>Welcome back</p>
<container else><a href="/login">Sign in</a></container>
```

On a lowercase tag TypeScript cannot infer the item, so annotate it, or use `<For>` where the type
should be inferred. In an app built by `@fluixi/start`, `Show`, `For`, `Index`, `Switch` and
`Match` need no import.

Next: **[Lifecycle](/v1/en/lifecycle)**.
