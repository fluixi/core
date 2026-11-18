# Directives

Directives are special attributes the compiler understands. Most work in **both** JSX and
`` html`` ``; a few forms (`bind:`, `.prop`, `?attr`, dotted event modifiers) are
`` html`` ``-only, because they have no clean, type-checkable JSX equivalent.

## Events

Delegated events (one listener at the root, dispatched by the framework):

```ts
html`<button @click=${onClick}>Save</button>`;   // html``, @event
// JSX equivalent:
<button onClick={onClick}>Save</button>;
```

`@click` and `onClick` are byte-identical.

### Delegated vs native

Twelve events are delegated: **`click`, `dblclick`, `input`, `change`, `submit`, `focus`,
`blur`, `keydown`, `keyup`, `keypress`, `mousedown`, `mouseup`**. One listener is attached at the
root and dispatched to the right element, so a thousand rows cost one listener rather than a
thousand.

Everything else attaches directly. For a **native** listener on a delegated event,
required for `capture`, `once` or `passive`, use `on:`:

```ts
html`<div on:scroll=${onScroll}></div>`;
<div on:scroll={onScroll} />;   // JSX, on: index signature
```

A delegated handler still sees `event.currentTarget` as the element it is attached to, as it
would with `addEventListener`, so `new FormData(event.currentTarget)` works in an `onSubmit`.

### Modifiers

Dotted modifiers work on the `@`/`on:` forms in html`` templates; a JSX attribute name cannot hold the dots, so in JSX pass the handler and its options to `on:` as a pair, `on:scroll={[onScroll, { passive: true }]}`. The modifiers:

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
layout in `onMount`, not in the ref callback, at ref time the element has no box.

### use, custom directives

`use=${fn}` calls `fn(element)` when the element mounts; the named form passes options:

```ts
html`<div use=${tooltip}></div>`;
html`<div use:tooltip=${{ text: 'Hi' }}></div>`;
<div use:tooltip={{ text: 'Hi' }} />;   // JSX
```

A directive is an ordinary function, `(el, options) => ...`. Options are passed as an
accessor so the directive can track them, and anything the directive registers should be
cleaned up with `onCleanup` inside it.

In JSX the name has to be a value TypeScript can see, so import the directive even if only
the directive form uses it.

### prop: / attr: / bool:

Force how a value is applied, bypassing the property-vs-attribute heuristic. These work in
**both** JSX and `` html`` ``:

```ts
html`<input prop:value=${text()} />`;      // always the DOM property (element.value = ...)
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

- **Custom elements** taking rich values, an object must go through a property, since an
  attribute would stringify it to `[object Object]`.
- **Values that differ from their attribute**, `input.value` is the live value, while the
  `value` attribute is only the default.
- **Boolean attributes**, `disabled="false"` is still disabled; `bool:` removes it.

### .prop and ?attr (html`` shorthands)

Lit-style shorthands for the same idea:

```ts
html`<video .currentTime=${t()}></video>`;   // property binding, same as prop:
html`<button ?disabled=${busy()}></button>`; // boolean attribute, same as bool:
```

### class and style

`classList` and a `style` object work in both surfaces:

```ts
html`<div class=${{ active: on(), big: large() }}></div>`;
html`<div style=${{ color: c(), '--x': px() }}></div>`;
<div classList={{ active: on() }} style={{ color: c() }} />;
```

A static `class` and a dynamic one combine, `class="box"` stays as the element's class
and the object adds to it, so you can keep base classes in markup.

> **An object in `class=` is a class map, inline or not.** `class=${{ on: a() }}` compiles to
> one, and `const o = { on: a() }; class=${o}` reaches the runtime as an object, which
> renders its truthy keys the same way.

Per-name toggles sidestep that entirely, in both surfaces, and each one updates only its own class
or property:

```ts
html`<div class:active=${on()} class:big=${large()}></div>`;
html`<div style:color=${c()} style:--x=${px()}></div>`;
<div class:active={on()} style:color={c()} />;
```

Custom properties (`--x`) are set through `setProperty`, so they work in both forms. JSX cannot
parse `style:--x`, since a name cannot start with `-`: put the property in the style object
instead, `style={{ '--x': px() }}`. On an element, a style object written as a literal also
updates property by property.

### html, raw innerHTML

```ts
html`<div html=${markup()}></div>`;      // html``, sets innerHTML
<div innerHTML={markup()} />;            // JSX, the prop is named innerHTML
```

The `html=` spelling is `` html`` ``-only; in JSX write `innerHTML` directly. Both are
reactive when given an accessor.

> **This is the one place a hole is parsed as HTML.** Everywhere else a value becomes text
> or an attribute and cannot inject markup. Never pass user-supplied content here without
> sanitising it, a string containing `<img onerror=...>` will execute. If you only need
> text, interpolate normally; that is already safe.

Content set this way is replaced wholesale on change, so anything inside it is outside the
reactive system, no bindings, no components, no cleanup.

### ...spread

Spread a props/attributes object (merged with `mergeProps`):

```ts
html`<div ...${attrs}></div>`;
<div {...attrs} />;
```

Spread is applied in written order, so a prop after the spread wins and a prop before it
can be overwritten. Pass a getter or a store when the set of props itself changes.

## Control flow

`if`, `else` and `each` compile to `<Show>` and `<For>`. They work in html`` templates and
in JSX, on any element and on `<container>`.

### if / else

```ts
html`
  <p if=${user()}>Welcome, ${user()!.name}</p>
  <a else href="/login">Sign in</a>
`;
```

```tsx
<p if={user()}>Welcome, {user()!.name}</p>
<a else href="/login">Sign in</a>
```

`if` compiles to `<Show when>`. The next sibling becomes the fallback when it carries
`else`. Whitespace between the two is fine; any other text or element breaks the pairing.

The branch is created and destroyed, not hidden: leaving it runs cleanup, and returning
builds it fresh.

### each / key

```ts
html`<ul each=${items()}>${(item) => html`<li>${item.label}</li>`}</ul>`;
```

`each` compiles to a `<For each>` inside the element. The element is rendered once and its
content once per item. The `${(item) => ...}` child is the render function and receives
the item itself. Content that is not a function is repeated as written.

Put `each` on the list, not on the item:

```ts
html`<div class="swatches" each=${colors()}>
  ${(color) => html`<span style="background: ${color}">${color}</span>`}
</div>`;
```

A render function that returns text stays reactive: `${(item) => item.label + suffix()}`
updates when `suffix` changes.

Add `key` to key the list by a field, or pass a function that returns the key, so rows are
reused by identity rather than by position. With a key, the render function receives an
accessor:

```ts
html`<ul each=${rows()} key="id">${(row) => html`<li>${row().name}</li>`}</ul>`;
```

Without a key, a row's DOM is tied to its index: inserting at the front rebuilds
everything after it. With one, only what actually moved is touched. Key any list whose
items are inserted, removed or reordered.

`if` and `each` can sit on the same element. The condition decides whether the element
exists, and the list fills it.

JSX takes the same attributes:

```tsx
<ul each={rows()} key="id">{(row: Accessor<Row>) => <li>{row().name}</li>}</ul>
```

TypeScript cannot infer `row` on a lowercase tag, so annotate the parameter, or use `<For>`
where you want it inferred. In html`` templates the Fluixi TypeScript plugin infers it.

### container

`<container>` carries `if`, `else` or `each` without adding an element. The compiler
removes it and renders only its content, which matters where a wrapper would break the
markup:

```ts
html`<tr>
  <container each=${rows()}>${(r) => html`<td>${r.name}</td><td>${r.total}</td>`}</container>
</tr>`;

html`
  <container if=${user()}><Avatar /> ${user()!.name}</container>
  <container else><a href="/login">Sign in</a></container>
`;
```

It works the same way in JSX. Other attributes on it are ignored. The name has no dash, so
it can never clash with a custom element.

### bind: two-way binding

`bind:value` and `bind:checked` bind an input to a signal:

```ts
const name = $signal('');
html`<input bind:value=${name} />`;                 // value + input event
html`<input type="checkbox" bind:checked=${on} />`; // checked + change event
```

Pass the signal itself, `signal(...)` or the `[get, set]` pair from `createSignal(...)`, either
works, never a bare accessor, since the binding writes as well as reads. The
binding reads `event.target`, so it works on any element that carries a `value` or
`checked`. For anything else, a select's multiple values, a number that needs parsing,
write the two halves yourself; `bind:` is deliberately only the common case.

## JSX vs html`` at a glance

| Directive | JSX | html`` |
| --- | --- | --- |
| `@click` / `onClick`, `on:event` | ✓ | ✓ |
| event modifiers (`@click.once`, `.capture`, `.passive`) |, | ✓ |
| `ref` | ✓ | ✓ |
| `use:` | ✓ | ✓ |
| `prop:` / `attr:` / `bool:` | ✓ | ✓ |
| `classList`, `style` object, `...spread` | ✓ | ✓ |
| raw HTML | `innerHTML` | `html=` or `innerHTML` |
| `oncapture:event` | ✓ |, |
| `.prop`, `?attr` |, | ✓ |
| `class:name`, `style:prop` | ✓ | ✓ |
| `if` / `else`, `each` / `key`, `<container>` | ✓ | ✓ |
| `bind:` |, | ✓ |
