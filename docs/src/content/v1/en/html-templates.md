# html`` templates

Fluixi lets you author markup two ways: **JSX**, or a tagged `` html`` `` template. Both
compile to the *same* fine-grained DOM calls, so there is no runtime difference,
`` html`` `` is a JSX-free authoring surface for when you do not want to configure JSX in
your tsconfig.

```ts
import { html } from '@fluixi/core';

function Hello(props: { name: string }) {
  return html`<h1>Hello ${props.name}</h1>`;
}
```

Import `html` (and `svg`) from `@fluixi/core`, or from `@fluixi/start` in a
meta-framework app.

## How it compiles

This matters for understanding everything below. The template is **not** parsed at
runtime. At build time the compiler splits it into static markup and holes, emits the
static part once, and wires each hole to a targeted DOM call:

```ts
html`<p class="row">Count: ${count()}</p>`;
```

becomes, in effect, one `<p class="row">` built once and a single text node kept up to
date by an effect. Nothing re-renders; nothing is diffed.

Two consequences worth knowing:

- **A hole's value is never parsed as HTML.** It is assigned as text, as an attribute, or
  as a property. Interpolating a string containing `<script>` inserts that text, it does
  not create an element. The one deliberate exception is [`html=`](/v1/en/directives),
  which is documented as an escape hatch for exactly that reason.
- **The template's shape is fixed at build time.** A hole can supply a value, a child, a
  component or a set of props, but not a tag name or an attribute name, because those
  decide the shape. See [dynamic tags](#components) for the component case.

## Interpolation

Any `${...}` is a reactive hole. Reading a signal inside one keeps that spot, and only
that spot, up to date:

```ts
const count = $signal(0);
html`<p>Count: ${count()}</p>`;
```

### Where a hole can go

```ts
html`<p>${text()}</p>`;                    // child, text, node, array, or another template
html`<div title=${label()}></div>`;        // whole attribute value
html`<div class="card ${theme()}"></div>`; // part of a quoted value
html`<div ...${attrs}></div>`;             // a whole props object
html`<${Card} />`;                         // a component in tag position
```

A hole that fills an **entire** attribute value passes through untouched, so it can be any
type, a number, a boolean, an object for `class`/`style`. Quoting makes no difference
there; `value=${n}` and `value="${n}"` compile identically.

Mixing static text with a hole is string interpolation, and the result is always a string:

```ts
html`<input value=${0} />`;               // the number 0
html`<div class="card ${theme()}"></div>`; // the string "card dark"
```

### Reading a signal, not passing it

Read the signal inside the hole. The hole itself is the reactive boundary, so the
compiler wraps it in an effect for you:

```ts
html`<p>${count()}</p>`;              // ✓ tracked, re-runs this text node only
html`<p>${count}</p>`;                // also updates: the insert calls the function
html`<p class="n ${count}"></p>`;     // ✗ the function's source, once: call it here
```

Where the hole stands decides it. As a child, a bare signal is called and tracked like a read.
Inside an attribute that mixes text with it, the value is built as a string once, so the
signal has to be called. With the browser runtime (templates used with no build step), a hole
is evaluated once and only the bare form, `${count}`, keeps updating.

## Components

Two forms, and the difference is only about how TypeScript sees the name:

```ts
// Dynamic tag, `${Card}` is a real expression, so TypeScript counts it as used.
html`<${Card} title=${t()} />`;

// Static tag, bare name, matching JSX.
html`<Card title=${t()} />`;
```

The static form needs something to tell TypeScript the name is in use, since it is only
text inside a string: either [`@fluixi/ts-plugin`](#editor-support), or a
[`resolve` rule](/v1/en/component-resolution) that supplies the component without an
import. In a plain-TypeScript project with neither, prefer `` <${Card}/> ``.

Children and closing tags work as expected. A dynamic tag closes with the same
expression:

```ts
html`<${Card}>
  <p>Body</p>
</${Card}>`;

html`<Card>
  <p>Body</p>
</Card>`;
```

Self-closing works for both forms, and, unlike HTML, for any component.

### Auto-imported components

Control-flow and router components resolve without an import: write `<Show>`, `<For>`,
`<Router>`, `<Outlet>` and the compiler adds it for you.

```ts
html`
  <${Show} when=${user()} fallback=${html`<a href="/login">Sign in</a>`}>
    <p>Welcome, ${user()!.name}</p>
  </${Show}>
`;
```

Your own components and a component library's can join them, see
**[component resolution](/v1/en/component-resolution)**.

### Props

Every prop is a hole, and each is independently reactive:

```ts
html`<${Row} label="Static" count=${n()} onSelect=${pick} ...${rest} />`;
```

Children arrive as `props.children`. A function child is passed through as a function,
which is what `<For>` and `each` rely on.

## Nested templates

A hole can hold another template, useful for `fallback`, list items, or conditional
branches:

```ts
html`<ul>${items().map((i) => html`<li>${i.label}</li>`)}</ul>`;
```

Nested templates compile like any other: the inner one is built once and reused per call.
For a list that changes, prefer [`each`](/v1/en/directives) or `<For>`, `.map()` rebuilds
every row on every change, while `<For>` reuses the rows whose data did not move.

## SVG

Use the `svg` tag to put a subtree in the SVG namespace. Elements created there need the
SVG namespace, which the `html` tag does not apply:

```ts
import { svg } from '@fluixi/core';

svg`<circle cx="50" cy="50" r=${r()} />`;
```

An `<svg>` root written inside `` html`` `` also works, the compiler recognises the tag
and creates the subtree in the SVG namespace. Reach for `` svg`` `` when a template
*starts* below the root, with a `<circle>` or `<path>` that has no `<svg>` ancestor in the
same template to give it away.

## Whitespace and text

Whitespace is preserved as written, like HTML, collapsed by CSS at render time, not by
the compiler. `<pre>`, `<textarea>` and `<script>` keep their content verbatim. So does `<style>`,
unless component styles are on: then its CSS is compiled, see [Styling](/v1/en/styling).

## Editor support

`@fluixi/ts-plugin` (included in every scaffolded app, and shipped in the VS Code
extension) gives `` html`` `` real IntelliSense: hover, completion of element attributes
and component props, go-to-definition on tags, and type-checking of the JavaScript inside
the holes, the same experience JSX gets. Reference it in `tsconfig.json`:

```json
{ "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
```

The plugin runs in your editor's TypeScript service, never in `tsc`. A project on TypeScript 7
keeps it in VS Code: the built-in TypeScript still loads it, and the `typescript@7` package has no
service of its own to switch to. The TypeScript Native Preview extension does not load plugins.
With it, html`` templates have no hover, completion or typed callback parameters, and a
component used only as a tag shows as unused. JSX keeps all of it, since TypeScript reads JSX
itself. `fluixi check` runs the env and auth rules from the command line on either version.

## When to reach for html``

- You do not want `jsx`/`jsxImportSource` in your tsconfig (a library, a script, plain TS).
- You prefer template-literal markup.
- You want the `` html`` ``-only directives: `if`/`else`, `each`, `bind:`, `class:name`,
  `style:prop`.
- You want to mix the two, a `` html`` `` block inside a JSX component, or vice-versa,
  both compile.

Next: the full **[directives](/v1/en/directives)** reference (events, bindings,
`if`/`each`, ...).
