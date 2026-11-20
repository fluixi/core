# Derived values

A **memo** is a value computed from other reactive values. It caches its result and recomputes
only when one of the values it read has changed.

```ts
import { signal, memo } from '@fluixi/reactive/signal';

const first = signal('Ada');
const last  = signal('Lovelace');

const fullName = memo(() => `${first()} ${last()}`);

fullName(); // "Ada Lovelace"
```

`$memo` is the same without the import:

```ts
const fullName = $memo(() => `${first()} ${last()}`);
```

## A realistic example

A searchable, sorted product list. The filtered list is read by the list and by the count, so it
is computed once per change and shared:

```tsx
function Catalog(props: { products: Product[] }) {
  const query = $signal('');
  const sort = $signal<'name' | 'price'>('name');

  const visible = $memo(() => {
    const q = query().trim().toLowerCase();
    const found = props.products.filter((p) => p.name.toLowerCase().includes(q));
    return found.sort((a, b) => (sort() === 'name' ? a.name.localeCompare(b.name) : a.price - b.price));
  });

  return (
    <section>
      <input value={query()} onInput={(e) => query.set(e.currentTarget.value)} placeholder="Search" />
      <p>{visible().length} products</p>
      <ul>
        <For each={visible()} by={(p) => p.id}>
          {(p) => <li>{p().name}, {p().price} €</li>}
        </For>
      </ul>
    </section>
  );
}
```

Typing a letter recomputes `visible` once; the count's text node and the rows that changed update.
`by` keeps the rows that stay, so their DOM is not rebuilt ([Control flow](/v1/en/control-flow)).

## Lazy and cached

A memo computes only when it is **read**, and recomputes only when one of its sources really
changed. Reading it again returns the cached value:

```ts
const expensive = memo(() => heavyCompute(data()));
expensive(); // computes once
expensive(); // cached, no recompute
```

A memo nothing reads never runs.

## Glitch-free

When a change fans out and meets again, a memo recomputes **once**, with consistent inputs, never
with a half-updated value:

```ts
const a = signal(1);
const b = memo(() => a() + 1);
const c = memo(() => a() * 2);
const d = memo(() => b() + c());

a.set(2); // d recomputes a single time, with b and c both updated
```

## The previous value and equality

The function receives its previous result, which makes an accumulator cheap without a second
signal; the second argument is the starting value:

```ts
const highest = memo((prev = 0) => Math.max(prev, reading()), 0);
```

As with signals, `equals` decides what counts as a change for the memo's own readers:

```ts
const bounds = memo(() => measure(items()), undefined, {
  equals: (a, b) => a.width === b.width && a.height === b.height,
});
```

## Many rows asking "is it me?"

A list where one row is selected: with a plain comparison in each row, changing the selection
re-runs the comparison in every row. `createSelector` gives each key its own boolean, so only the
row that was selected and the row that now is update:

```tsx
import { createSelector } from '@fluixi/reactive/signal';

const selected = $signal<string | null>(null);
const isSelected = createSelector(selected);

<For each={rows()} by={(r) => r.id}>
  {(row) => <tr class={isSelected(row().id) ? 'active' : ''} onClick={() => selected.set(row().id)}>...</tr>}
</For>
```

## Keeping the page responsive

`createDeferred(source, { timeoutMs })` follows a value but applies its updates when the browser
is idle (or after `timeoutMs`). Typing stays smooth while a heavy view built from the value catches
up:

```ts
import { createDeferred } from '@fluixi/reactive/signal';

const deferredQuery = createDeferred(query, { timeoutMs: 200 });
const results = memo(() => search(deferredQuery()));
```

## Where to use it, and where not

Use a memo for a value derived from state that several places read, or that costs something to
compute: a filtered list, a total, a formatted date, a permission check.

**Not for a cheap value read once.** A plain function does the same with less bookkeeping:

```ts
const label = () => `${count()} items`; // enough when only one place reads it
```

**Not for side effects.** A memo runs when it is read, maybe never, maybe late; writing a signal,
fetching or logging there does not happen when you expect. Use an [effect](/v1/en/effects), or a
[resource](/v1/en/async) for data.

**Not creating signals or effects inside it.** They are rebuilt on every recompute. Create them once
in the component body.

**Not to copy a value into a signal.** If you find an effect that writes a signal from other
signals, it should be a memo.

## Under the hood

A memo is a computed node in the reactive graph. A write to one of its sources marks it "maybe
dirty"; the next read checks its sources in order and recomputes only if one of them really
produced a new value, then stores the result. Readers of the memo are notified only when its own
value changed, according to `equals`.

## The accessor form

`createMemo` is the same primitive under its older name:

```ts
import { createMemo } from '@fluixi/reactive/signal';

const fullName = createMemo(() => `${first()} ${last()}`);
fullName(); // "Ada Lovelace"
```

`memo` returns that same accessor, so the two mix freely with signals written either way.

Next: **[Effects](/v1/en/effects)**.
