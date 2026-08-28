---
"@fluixi/reactive": minor
"fluixi": minor
---

Add `createDebouncedSignal` and `createDebouncedResource`; stop `createDebounce`
touching the DOM.

**Two values, not one.** A debounced input has an immediate value — what the user
is typing, and what a controlled input must be bound to — and a settled value,
which is what a query should run on. Collapsing them into one delayed signal makes
a controlled input lag behind the keyboard, so both are exposed:

```ts
const [query, setQuery, { immediate, pending, flush, cancel }] =
  createDebouncedSignal('', 300);
```

`flush` and `cancel` are part of the primitive rather than extras: a search box
needs "submit now" on Enter, and leaving a screen needs to drop a pending write
instead of firing it into a disposed scope. Disposal cancels automatically.

`createDebouncedResource` is search-as-you-type as one primitive, and keeps the
two waiting states apart: `pending` is "still typing", `resource.loading` is "a
request is in flight". A UI that conflates them either flickers on every keystroke
or looks frozen while typing. An empty query doesn't fetch, so clearing a search
box doesn't hit the network; `shouldFetch` overrides that rule.

**Behaviour change:** `createDebounce` inspected its last argument and, if it
looked like an `input`/`textarea` or an event targeting one, called `.focus()` on
it. A general-purpose debounce silently moving focus is a side effect nobody asks
for, it made the primitive unusable outside the DOM, and it fired on any argument
that happened to match. Removed. If a debounced update was relying on it to keep
focus, that belongs at the call site.
