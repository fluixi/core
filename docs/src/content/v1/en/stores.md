# Stores

A signal holds one value. A **store** holds nested state, objects and arrays, and tracks each key
on its own: reading `cart.total` subscribes to `total` only, so a change to `cart.items` does not
disturb it.

```ts
import { store } from '@fluixi/reactive/store';

const cart = store({
  items: [] as Item[],
  total: 0,
});

cart.total;              // read a property reactively
cart.set('total', 42);   // update one property: only readers of total update
```

You read a store's properties directly: it is an object, and the property access **is** the
reactive read, where a signal is a value you call. `$store` is the same without the import:

```ts
const cart = $store({ items: [], total: 0 });
```

## A realistic example

A cart where each line's quantity changes on its own. Changing one quantity updates that line's
number and the total, and nothing else:

```tsx
type Line = { id: string; name: string; price: number; qty: number };

function Cart() {
  const cart = $store({ lines: [] as Line[], coupon: '' });
  const total = $memo(() => cart.lines.reduce((sum, l) => sum + l.price * l.qty, 0));

  const add = (line: Line) => cart.set('lines', (lines) => [...lines, line]);
  const setQty = (i: number, qty: number) => cart.set('lines', i, 'qty', qty);
  const remove = (id: string) => cart.set('lines', (lines) => lines.filter((l) => l.id !== id));

  return (
    <section>
      <For each={cart.lines} by={(l) => l.id}>
        {(line, i) => (
          <div>
            {line().name}
            <input type="number" value={line().qty} onInput={(e) => setQty(i(), e.currentTarget.valueAsNumber)} />
            <button onClick={() => remove(line().id)}>Remove</button>
          </div>
        )}
      </For>
      <p>Total: {total().toFixed(2)} €</p>
    </section>
  );
}
```

## Writing

The state is read-only from the outside: assigning `cart.total = 1` does nothing. Every change
goes through `set`, which is what lets the store know exactly what changed.

```ts
cart.set('total', 42);                          // one key
cart.set('total', (t) => t + 1);                // from the previous value
cart.set('lines', 0, 'qty', (q) => q + 1);      // a path, one step per argument
cart.set('lines.0.qty', 3);                     // the same path as a string
cart.set({ coupon: 'WELCOME' });                // merge keys at the top level
cart.set('lines', (lines) => [...lines, item]); // replace an array with a new one
```

A reader of `cart.total` is **not** disturbed by a write to `cart.lines`: that is the point of a
store over a signal holding an object.

## Reading in computations

Reading a store property inside a memo, an effect or JSX subscribes to that property alone:

```ts
const itemCount = memo(() => cart.lines.length); // tracks the list's length only
```

Signals are created lazily, one per key something actually reads, so a large store costs what the
page looks at, not its size.

## Where to use it, and where not

Use a store for state with structure that changes in parts: a form with many fields, a cart, a
board of cards, editor state, settings.

**Not for a single value.** A store around `{ value: 0 }` is a signal with extra steps.

**Not for `Map`, `Set`, `Date` or class instances inside it.** A store tracks plain objects and
arrays; other values are stored as they are, and a change inside them is not seen. Keep plain data
in the store, or replace the whole value through `set`.

**Not when the state needs a key named `set`.** The handle uses `set` for its setter; use the tuple
form below.

**Not shared at module level in a server-rendered app.** As with signals, one module instance serves
every request on the server. Create the store in a component, or provide it per request with
[dependency injection](/v1/en/dependency-injection).

## Snapshots

`unwrap(cart)` returns the plain object behind the store, for `JSON.stringify` or a request body.
`untrackStore(cart)` does the same without subscribing the current computation.

## A mutable store

`createMutableStore` drops the setter: assigning a property is a tracked write. It suits state
local to one component, where a setter buys nothing; the cost is that a change can come from
anywhere holding the object.

```ts
import { createMutableStore } from '@fluixi/reactive/store';

const form = createMutableStore({ name: '', email: '' });
form.name = 'Ada'; // readers of form.name update
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
`createStore` when your state needs a `set` key of its own: the attached setter would hide it.

## Under the hood

A store is a proxy over a plain object. Reading a key through the proxy creates (on first read) a
signal for that key and subscribes the current computation to it; nested objects are wrapped the
same way when read. `set` resolves the path, writes the raw object, and notifies only the keys
whose values changed. Arrays track their indexes and `length`.

Next: **[Async data](/v1/en/async)**.
