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

Next: **[Lifecycle](/v1/en/lifecycle)**.
