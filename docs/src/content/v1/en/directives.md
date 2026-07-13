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

`@click` and `onClick` are byte-identical. For a **native** listener (`addEventListener`, bypassing
delegation — required for `capture`/`once`/`passive`) use `on:`:

```ts
html`<div on:scroll=${onScroll}></div>`;
<div on:scroll={onScroll} />;   // JSX — on: index signature
```

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

### use — custom directives

`use=${fn}` calls `fn(element)` when the element mounts; the named form passes options:

```ts
html`<div use=${tooltip}></div>`;
html`<div use:tooltip=${{ text: 'Hi' }}></div>`;
<div use:tooltip={{ text: 'Hi' }} />;   // JSX
```

### prop: / attr: / bool:

Force how a value is applied, bypassing the property-vs-attribute heuristic. These work in **both**
JSX and `` html`` ``:

```ts
html`<input prop:value=${text()} />`;   // always the DOM property (element.value = …)
html`<div attr:data-id=${id()} />`;     // always setAttribute
html`<button bool:disabled=${busy()} />`; // boolean attribute: present when truthy, removed when falsy
```

```tsx
<my-widget prop:config={config()} />;
<circle attr:cx={x()} />;
<button bool:disabled={busy()} />;
```

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

`` html`` `` additionally offers per-name toggles:

```ts
html`<div class:active=${on()} class:big=${large()}></div>`;
html`<div style:color=${c()} style:--x=${px()}></div>`;
```

### html — raw innerHTML

```ts
html`<div html=${markup()}></div>`;   // sets innerHTML (reactive when given an accessor)
```

### ...spread

Spread a props/attributes object (merged with `mergeProps`):

```ts
html`<div ...${attrs}></div>`;
<div {...attrs} />;
```

## Control flow (html`` only)

These compile to the `<Show>` / `<For>` components — sugar for common cases.

### if / else

```ts
html`
  <p if=${user()}>Welcome, ${user()!.name}</p>
  <a else href="/login">Sign in</a>
`;
```

`if` compiles to `<Show when>`; an immediately-following sibling with `else` becomes the fallback.

### each / key

```ts
html`<li each=${items()}>${(item) => item.label}</li>`;
```

`each` compiles to `<For each>`; the `${item => …}` child is the render function. Add `key="id"` to
key the list by a field (rows are then reused by identity):

```ts
html`<li each=${rows()} key="id">${(row) => row().name}</li>`;
```

### bind: — two-way binding

`bind:value` / `bind:checked` bind an input to a `[get, set]` signal tuple:

```ts
const name = createSignal('');
html`<input bind:value=${name} />`;              // value + input event
html`<input type="checkbox" bind:checked=${on} />`; // checked + change event
```

## JSX vs html`` at a glance

| Directive | JSX | html`` |
| --- | --- | --- |
| `@click` / `onClick`, `on:event`, modifiers | ✓ | ✓ |
| `ref`, `use:` | ✓ | ✓ |
| `prop:` / `attr:` / `bool:` | ✓ | ✓ |
| `classList`, `style` object, `...spread` | ✓ | ✓ |
| `oncapture:event` | ✓ | — |
| `.prop`, `?attr` | — | ✓ |
| `class:name`, `style:prop` | — | ✓ |
| `if` / `else`, `each` / `key`, `bind:` | — (use `<Show>`/`<For>`) | ✓ |
