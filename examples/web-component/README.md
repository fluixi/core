# Custom elements

Four custom elements written with @fluixi/web-components, built as standalone files for any page, and the same elements inside a Fluixi app.

## What is here

| File | Shows |
|------|-------|
| `src/elements/counter.ts` | class form: props, a change event, public increment() and reset(), #private state |
| `src/elements/bounded-counter.ts` | inheritance: extends the counter, adds max, fires limit |
| `src/elements/form-field.ts` | a mixin: makes an element a form control through ElementInternals |
| `src/elements/rating.ts` | a form control built with the mixin: submits with its form, required, reset, arrow keys |
| `src/elements/disclosure.ts` | function form: shadow DOM, named slots, a reflected open attribute |
| `demo/index.html` | the built files on a plain page |
| `src/app.tsx` | the same elements in a Fluixi app |
| `tests/interop.spec.ts` | the built files from plain DOM, React 19, Vue 3 and Svelte 5 |

## Run it

```bash
pnpm build    # dist/elements/*.js
pnpm demo     # demo/index.html, using those files
pnpm dev      # the Fluixi app on http://localhost:3200
pnpm test     # the built files from plain DOM, React, Vue and Svelte
```
The demo needs pnpm build first.

## Use a built file

pnpm build writes `dist/elements/*.js`, one standalone file per element, about 43 KB each, under 13 KB gzipped, no imports. A built file carries its own runtime; several on one page share one reactive graph. Elements register with `defineCustomElement`, which skips a name already defined: `bounded-counter.js` carries the counter again.

```html
<script type="module" src="counter.js"></script>
<fx-counter step="2" label="Clicks"></fx-counter>
<script type="module">
  document.querySelector('fx-counter').addEventListener('change', (e) => console.log(e.detail.value));
</script>
```

```tsx
// React 19 sets props as properties and listens with on + the event name.
<fx-counter step={2} onchange={(e) => setValue(e.detail.value)} />
```

```ts
// Vue 3: onChange listens to `change`; a prop the element declares is set as a property.
h('fx-counter', { step: 2, onChange: (e) => (value.value = e.detail.value) })
```

## Inside a Fluixi app

In the app the server renders the tags as plain HTML with their primitive props as attributes. The client entry registers the elements after hydration. Props are set as properties (e.g., `step={2}` is a number). Events arrive in JSX handlers typed from each element's `JSXCustomElements` entry. In development the devtools graph shows each element as a custom element group holding its props.
