# Lifecycle

Components don't re-render, so "lifecycle" is just a few primitives tied to the reactive owner tree.

## onMount

Run code once, after the component's DOM is in place (client-only — it never runs during SSR):

```tsx
import { onMount } from '@fluixi/core';

onMount(() => {
  inputRef.focus();
});
```

## onCleanup

Run code when the owning scope is disposed (and before an effect re-runs):

```tsx
import { onCleanup } from '@fluixi/core';

const id = setInterval(tick, 1000);
onCleanup(() => clearInterval(id));
```

## Refs

Get the underlying DOM node with `ref`:

```tsx
let el!: HTMLInputElement;
<input ref={(node) => (el = node)} />;
// or simply: <input ref={el} />
```

Next: **[Routing](/v1/en/routing)**.
