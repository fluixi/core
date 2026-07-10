# @fluixi/testing

Minimal helpers for testing Fluixi components. It renders a component into a
jsdom container, gives you a disposer and query shorthands, and re-exports
`flush` so you can await effects. For queries and matchers beyond the basics,
reach for [`@testing-library/dom`](https://testing-library.com/docs/dom-testing-library/intro/)
— it works against the DOM, so it composes with this out of the box.

> Alpha. The surface here is deliberately small; richer utilities will grow from
> real usage.

## Install

```sh
npm i -D @fluixi/testing vitest jsdom
```

Point vitest at jsdom:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
```

## Use

```tsx
import { render, flush, fireEvent } from '@fluixi/testing';
import { Counter } from './Counter';

it('increments on click', async () => {
  const { find, unmount } = render(() => <Counter start={2} />);

  expect(find('output')!.textContent).toBe('2');

  fireEvent(find('button')!, 'click');
  await flush(); // let effects settle

  expect(find('output')!.textContent).toBe('3');
  unmount();
});
```

## API

### `render(code, options?) → RenderResult`

Mounts `code` (a thunk that returns your component/element) into a container.
By default it creates a `<div>` and appends it to `document.body`; pass
`options.container` to mount elsewhere.

`RenderResult`:
- `container` — the element rendered into.
- `unmount()` — dispose the reactive root and detach the container.
- `find(selector)` — `container.querySelector`.
- `findAll(selector)` — `container.querySelectorAll`, as an array.
- `html()` — the container's current `innerHTML`.

### `flush() → Promise<void>`

Flushes pending reactive effects. Also exported as `flushEffects`.

### `fireEvent(node, type, init?) → boolean`

Dispatches a bubbling, cancelable event. Bubbling matters — Fluixi delegates
`on*` handlers, so a non-bubbling event won't reach them. For anything richer,
use `node.dispatchEvent(...)` directly or `@testing-library/dom`'s `fireEvent`.

### SSR assertions

`renderToString` is re-exported for asserting server output:

```ts
import { renderToString } from '@fluixi/testing';

expect(renderToString(() => <Hello name="world" />)).toContain('world');
```

## With @testing-library/dom

```ts
import { render } from '@fluixi/testing';
import { getByRole } from '@testing-library/dom';

const { container } = render(() => <LoginForm />);
getByRole(container, 'button', { name: /sign in/i }).click();
```
