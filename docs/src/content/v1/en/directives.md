# Directives

Directives are special attributes the compiler understands. Most work in **both** JSX and
`` html`` ``; a few keyword forms (`if`, `each`, `bind:`, `class:name`, `style:prop`) are
`` html`` ``-only, because they have no clean, type-checkable JSX equivalent.

## Events

Delegated events (one listener at the root, dispatched by the framework):

```ts
html`<button @click=${onClick}>Save</button>`;   // html`` — @event
// JSX equivalent:
<button onClick={onClick}>Save</button>;
```

`@click` and `onClick` are byte-identical.

### Delegated vs native

Four events are delegated: **`click`, `input`, `change`, `submit`**. One listener is
attached at the root and dispatched to the right element, so a thousand rows cost one
listener rather than a thousand.

Everything else attaches directly. For a **native** listener on a delegated event —
required for `capture`, `once` or `passive` — use `on:`:

```ts
html`<div on:scroll=${onScroll}></div>`;
<div on:scroll={onScroll} />;   // JSX — on: index signature
```

Delegation is worth knowing about in one case: inside a delegated handler, `currentTarget`
is the root, not your element. Use `event.target`, or reach for `on:` if you need the
normal semantics.

### Modifiers

Dotted modifiers work on the `@`/`on:` forms:

| Modifier | Effect |
| --- | --- |
| `.capture` | listen in the capture phase |
| `.once` | remove after the first call |
| `.passive` | mark the listener passive |
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.self` | only when `event.target === currentTarget` |

```ts
html`<form @submit.prevent=${save}></form>`;
html`<div on:wheel.passive=${onWheel}></div>`;
```

`.capture`, `.once` and `.passive` become `addEventListener` options, so they imply a
native listener. `.prevent`, `.stop` and `.self` wrap your handler and work either way.

In JSX, `oncapture:event` is shorthand for a capture-phase native listener:

```tsx
<div oncapture:click={onClick} />;
```

## Element bindings

### ref

Capture the element into a variable or callback:

```ts
let el!: HTMLInputElement;
html`<input ref=${el} />`;
html`<input ref=${(node) => (el = node)} />`;
```

The ref is set as the element is created, **before** it is attached to the document. Read
layout in `onMount`, not in the ref callback — at ref time the element has no box.

### use — custom directives

`use=${fn}` calls `fn(element)` when the element mounts; the named form passes options:

```ts
html`<div use=${tooltip}></div>`;
html`<div use:tooltip=${{ text: 'Hi' }}></div>`;
<div use:tooltip={{ text: 'Hi' }} />;   // JSX
```

A directive is an ordinary function — `(el, options) => …`. Options are passed as an
accessor so the directive can track them, and anything the directive registers should be
cleaned up with `onCleanup` inside it.

In JSX the name has to be a value TypeScript can see, so import the directive even if only
the directive form uses it.

### prop: / attr: / bool:

Force how a value is applied, bypassing the property-vs-attribute heuristic. These work in
**both** JSX and `` html`` ``:

```ts
html`<input prop:value=${text()} />`;      // always the DOM property (element.value = …)
html`<div attr:data-id=${id()} />`;        // always setAttribute
html`<button bool:disabled=${busy()} />`;  // present when truthy, removed when falsy
```

```tsx
<my-widget prop:config={config()} />;
<circle attr:cx={x()} />;
<button bool:disabled={busy()} />;
```

Normally the heuristic gets it right. The three cases where it does not, and you need to
force it:

- **Custom elements** taking rich values — an object must go through a property, since an
  attribute would stringify it to `[object Object]`.
- **Values that differ from their attribute** — `input.value` is the live value, while the
  `value` attribute is only the default.
- **Boolean attributes** — `disabled="false"` is still disabled; `bool:` removes it.

### .prop and ?attr (html`` shorthands)

Lit-style shorthands for the same idea:

```ts
html`<video .currentTime=${t()}></video>`;   // property binding — same as prop:
html`<button ?disabled=${busy()}></button>`; // boolean attribute — same as bool:
```

### class and style

`classList` and a `style` object work in both surfaces:

```ts
html`<div class=${{ active: on(), big: large() }}></div>`;
html`<div style=${{ color: c(), '--x': px() }}></div>`;
<div classList={{ active: on() }} style={{ color: c() }} />;
```

A static `class` and a dynamic one combine — `class="box"` stays as the element's class
and the object adds to it, so you can keep base classes in markup.

> **`class=` only becomes `classList` for a literal object.** The compiler decides by
> looking at the syntax, so `class=${{ on: a() }}` is a class map, while
> `const o = { on: a() }; class=${o}` compiles to `className = o` and renders
> `[object Object]`. Pass the literal inline, or use `classList=` explicitly.

`` html`` `` additionally offers per-name toggles, which sidestep that entirely:

```ts
html`<div class:active=${on()} class:big=${large()}></div>`;
html`<div style:color=${c()} style:--x=${px()}></div>`;
```

Custom properties (`--x`) are set through `setProperty`, so they work in both forms.

### html — raw innerHTML

```ts
html`<div html=${markup()}></div>`;      // html`` — sets innerHTML
<div innerHTML={markup()} />;            // JSX — the prop is named innerHTML
```

The `html=` spelling is `` html`` ``-only; in JSX write `innerHTML` directly. Both are
reactive when given an accessor.

> **This is the one place a hole is parsed as HTML.** Everywhere else a value becomes text
> or an attribute and cannot inject markup. Never pass user-supplied content here without
> sanitising it — a string containing `<img onerror=…>` will execute. If you only need
> text, interpolate normally; that is already safe.

Content set this way is replaced wholesale on change, so anything inside it is outside the
reactive system — no bindings, no components, no cleanup.

### ...spread

Spread a props/attributes object (merged with `mergeProps`):

```ts
html`<div ...${attrs}></div>`;
<div {...attrs} />;
```

Spread is applied in written order, so a prop after the spread wins and a prop before it
can be overwritten. Pass a getter or a store when the set of props itself changes.

## Control flow (html`` only)

These compile to the `<Show>` / `<For>` components — sugar for common cases. In JSX, use
the components directly.

### if / else

```ts
html`
  <p if=${user()}>Welcome, ${user()!.name}</p>
  <a else href="/login">Sign in</a>
`;
```

`if` compiles to `<Show when>`; an **immediately following sibling** with `else` becomes
the fallback. Anything between them — even a text node — breaks the pairing, so keep them
adjacent.

The branch is created and destroyed, not hidden: leaving it runs cleanup, and returning
builds it fresh.

### each / key

```ts
html`<li each=${items()}>${(item) => item.label}</li>`;
```

`each` compiles to `<For each>`; the `${item => …}` child is the render function, and it
receives **the item itself**, not an accessor. The element carrying `each` is the one
repeated.

Add `key="id"` to key the list by a field, so rows are reused by identity rather than by
position:

```ts
html`<li each=${rows()} key="id">${(row) => row.name}</li>`;
```

Without a key, a row's DOM is tied to its index — inserting at the front rebuilds
everything after it. With one, only what actually moved is touched. Key any list whose
items are inserted, removed or reordered.

### bind: — two-way binding

`bind:value` and `bind:checked` bind an input to a `[get, set]` signal tuple:

```ts
const name = createSignal('');
html`<input bind:value=${name} />`;                 // value + input event
html`<input type="checkbox" bind:checked=${on} />`; // checked + change event
```

Pass the **tuple**, not the accessor — `createSignal` returns exactly what is needed. The
binding reads `event.target`, so it works on any element that carries a `value` or
`checked`. For anything else — a select's multiple values, a number that needs parsing —
write the two halves yourself; `bind:` is deliberately only the common case.

## JSX vs html`` at a glance

| Directive | JSX | html`` |
| --- | --- | --- |
| `@click` / `onClick`, `on:event`, modifiers | ✓ | ✓ |
| `ref` | ✓ | ✓ |
| `use:` | ✓ | ✓ |
| `prop:` / `attr:` / `bool:` | ✓ | ✓ |
| `classList`, `style` object, `...spread` | ✓ | ✓ |
| raw HTML | `innerHTML` | `html=` or `innerHTML` |
| `oncapture:event` | ✓ | — |
| `.prop`, `?attr` | — | ✓ |
| `class:name`, `style:prop` | — | ✓ |
| `if` / `else`, `each` / `key`, `bind:` | — (use `<Show>`/`<For>`) | ✓ |
