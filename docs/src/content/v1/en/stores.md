# Stores

Signals are great for single values; a **store** is for **nested, structured state**. It is a
reactive object with **fine-grained** tracking down to individual properties:

```ts
import { store } from '@fluixi/reactive/store';

const cart = store({
  items: [] as Item[],
  total: 0,
});

cart.total;              // read a property reactively
cart.set('total', 42);   // update one property — only readers of total re-run
```

You read a store's properties directly — it is an object, and the property access **is** the
reactive read, where a signal is a value you call. `$store` is the same thing without the import:

```ts
const cart = $store({ items: [], total: 0 });
```

## Path updates

The setter takes a **path** to the property you want to change, so reads of unrelated branches stay
untouched:

```ts
cart.set('items', items => [...items, newItem]);
cart.set('items', 0, 'qty', q => q + 1); // nested path
```

A reader of `cart.total` is **not** disturbed by a write to `cart.items` — that is the point of a
store over a single signal holding an object.

## Reading in computations

Reading a store property inside a memo or effect subscribes to just that property:

```ts
const itemCount = memo(() => cart.items.length); // tracks items only
```

## The tuple form

`createStore` returns the same store as a `[state, setter]` pair:

```ts
import { createStore } from '@fluixi/reactive/store';

const [cart, setCart] = createStore({ items: [], total: 0 });

cart.total;
setCart('total', 42);
```

`store` is that pair with the setter attached to the state, so both are one primitive. Use
`createStore` when your own state needs a `set` key of its own — the attached setter would
shadow it.

Next: **[Async data](/v1/en/async)**.
