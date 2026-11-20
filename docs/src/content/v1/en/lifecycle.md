# Lifecycle

A component function runs once and never re-renders, so its lifecycle comes down to two moments:
when it is in the page, and when it goes. `onMount` and `onCleanup` mark them; `ref` gives you the
element in between.

## onMount

Runs once, in the browser, after the component's elements are in the page. It never runs during a
server render.

```tsx
import { onMount } from '@fluixi/core';

function Search() {
  let input!: HTMLInputElement;
  onMount(() => input.focus());
  return <input ref={input} type="search" />;
}
```

A function returned from `onMount` runs when the component goes, so setup and teardown sit
together:

```ts
onMount(() => {
  const observer = new ResizeObserver(([entry]) => width.set(entry.contentRect.width));
  observer.observe(panel);
  return () => observer.disconnect();
});
```

## onCleanup

Runs when the owning scope is disposed: the component leaves the page, a `<Show>` branch closes, a
list row is removed. Inside an effect it also runs before each new run.

```tsx
import { onCleanup } from '@fluixi/core';

function Clock() {
  const now = $signal(new Date());
  const id = setInterval(() => now.set(new Date()), 1000);
  onCleanup(() => clearInterval(id));
  return <time>{now().toLocaleTimeString()}</time>;
}
```

`onUnmount` is the same function under another name.

## Refs

`ref` hands you the element itself. Assign it to a variable, or pass a function:

```tsx
let el!: HTMLInputElement;
<input ref={el} />;
<input ref={(node) => (el = node)} />;
```

The element exists from the moment the component builds it, but it is in the page only once
`onMount` runs: measure it, focus it or hand it to a library there.

## A realistic example

A dropdown that closes on a click outside it and on Escape. The listeners go on the document while
the dropdown is open, and come off when it closes or the component goes:

```tsx
function Dropdown(props: { label: string; children?: any }) {
  const open = $signal(false);
  let root!: HTMLDivElement;

  $effect(() => {
    if (!open()) return;
    const onPointer = (e: PointerEvent) => !root.contains(e.target as Node) && open.set(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open.set(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    });
  });

  return (
    <div ref={root}>
      <button aria-expanded={open()} onClick={() => open.set((o) => !o)}>{props.label}</button>
      <Show when={open()}>{props.children}</Show>
    </div>
  );
}
```

The effect reads `open()` first, so on the server, where the dropdown starts closed, it returns
before touching `document`.

## Where to use it, and where not

Use `onMount` for work that needs the element in the page or the browser itself: focus,
measurement, a third-party widget, reading `localStorage` or the viewport. Use `onCleanup` next to
anything that has to be undone: a timer, a listener, a subscription, a widget.

**`onMount` does not track.** A signal read inside it subscribes nothing, so it will not run again
when that signal changes. Use an effect for work that should follow a value.

**Not to load data.** Data loaded in `onMount` starts only after the page is shown, is missing from
the server render, and has no loading or error state. Use the route's `routeData` or a
[resource](/v1/en/async).

**Not as a way around a hydration mismatch, except on purpose.** Setting a signal in `onMount` to a
browser-only value (the viewport, a stored preference) is the right way to show it after hydration;
the first render, on both sides, uses the default. For a whole subtree that cannot render on the
server, `<ClientOnly>` is clearer.

**Every listener and timer needs its `onCleanup`.** Without it, a component that leaves the page
keeps running its timers and listeners, and leaks the memory they hold.

## Under the hood

Each component runs under an owner, a node in a tree that mirrors the component tree. `onMount`
queues its callback on the owner and runs the queue in a microtask after the component is built;
`onCleanup` adds a callback to the owner's disposal list. When an owner is disposed (its `<Show>`
closes, its row is removed, its parent goes), its children are disposed first, then its own
cleanups run in reverse order.

Next: **[Routing](/v1/en/routing)**.
