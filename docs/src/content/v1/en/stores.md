# Stores

Signals are great for single values; a **store** is for **nested, structured state**. `createStore`
returns a reactive proxy and a setter, with **fine-grained** tracking down to individual properties:

```ts
import { createStore } from '@fluixi/reactive/store';

const [cart, setCart] = createStore({
  items: [] as Item[],
  total: 0,
});

cart.total;            // read a property reactively
setCart('total', 42);  // update one property — only readers of total re-run
```

## Path updates

The setter takes a **path** to the property you want to change, so reads of unrelated branches stay
untouched:

```ts
setCart('items', items => [...items, newItem]);
setCart('items', 0, 'qty', q => q + 1); // nested path
```

A reader of `cart.total` is **not** disturbed by a write to `cart.items` — that is the point of a
store over a single signal holding an object.

## Reading in computations

Reading a store property inside a memo or effect subscribes to just that property:

```ts
const itemCount = createMemo(() => cart.items.length); // tracks items only
```

Next: **[Async data](/v1/en/async)**.
