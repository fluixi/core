# html`` templates

Fluixi lets you author markup two ways: **JSX**, or a tagged `` html`` `` template. Both compile to
the *same* fine-grained DOM calls, so there's no runtime difference — `` html`` `` is a JSX-free
authoring surface for when you don't want to configure JSX in your tsconfig.

```ts
import { html } from '@fluixi/core';

function Hello(props: { name: string }) {
  return html`<h1>Hello ${props.name}</h1>`;
}
```

Import `html` (and `svg`) from `@fluixi/core`, or from `@fluixi/start` in a meta-framework app.

## Interpolation

Any `${…}` is a reactive hole. Reading a signal inside one keeps that spot — and only that spot —
up to date:

```ts
const [count, setCount] = createSignal(0);
html`<p>Count: ${count()}</p>`;
```

Attributes interpolate the same way, including inside quoted values:

```ts
html`<div class="card ${theme()}" title=${label()}></div>`;
```

## Components

Use a component by tag. Two forms:

```ts
// Static tag — @fluixi/ts-plugin keeps TypeScript happy (it can't see inside the string).
html`<${UserCard} name=${user().name} />`;
// Dynamic tag — the ${} makes TypeScript see the reference natively; no plugin needed.
html`<${UserCard} name=${user().name} />`;
```

The `` <${Comp}/> `` (dynamic) form is recommended in plain-TypeScript projects: because `${Comp}` is
a real expression, TypeScript already counts it as used. Children and closing tags work as expected:

```ts
html`<${Card}>
  <p>Body</p>
</${Card}>`;
```

Control-flow and router components are **auto-imported** — write `<Show>`, `<For>`, `<Router>`,
`<Outlet>` and the compiler adds the import for you:

```ts
html`
  <${Show} when=${user()} fallback=${html`<a href="/login">Sign in</a>`}>
    <p>Welcome, ${user()!.name}</p>
  </${Show}>
`;
```

## Nested templates

A hole can hold another template — useful for `fallback`, list items, or conditional branches:

```ts
html`<ul>${items().map((i) => html`<li>${i.label}</li>`)}</ul>`;
```

## SVG

Use the `svg` tag to put a subtree in the SVG namespace:

```ts
import { svg } from '@fluixi/core';
svg`<circle cx="50" cy="50" r=${r()} />`;
```

## Editor support

`@fluixi/ts-plugin` (included in every scaffolded app, and shipped in the VS Code extension) gives
`` html`` `` real IntelliSense: hover, completion, and type-checking of the JavaScript inside the
holes — the same experience JSX gets. Reference it in `tsconfig.json`:

```json
{ "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
```

## When to reach for html``

- You don't want `jsx`/`jsxImportSource` in your tsconfig (a library, a script, plain TS).
- You prefer template-literal markup.
- You want to mix the two — a `` html`` `` block inside a JSX component, or vice-versa, both compile.

Next: the full **[directives](/v1/en/directives)** reference (events, bindings, `if`/`each`, …).
