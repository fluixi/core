# Hot reload

In `fluixi dev`, saving a component swaps it on the page without reloading. Its instances render
again with the new code; everything around them stays as it was: other components' signals,
what is typed in a form, the scroll position, the open menus.

Nothing to set up. A production build carries none of it.

## What a save does

Fluixi decides per file, from what the file exports.

| The file | On save |
|---|---|
| exports only components, plus a route's `routeData`, `routeDeps` and `default` | swapped in place |
| a helper a component imports (`format.ts`) | the importing component is swapped |
| creates state at its top level (`const theme = signal('dark')`) | its importer is swapped, and the state starts again |
| defines elements with `defineElement` | the elements are rebuilt in place |
| registers an element class with `defineCustomElement` | the class is updated in place, see below |
| registers a class with `customElements.define` | the page reloads |
| starts with `// @refresh reload` | the page reloads |

A component is a function whose name starts with a capital and has a lowercase letter: `Card`
is one, `GET` and `MAX_ITEMS` are not. A file exporting anything else is handled by whichever
file above it can swap.

Server code needs no reload at all: every request runs the current server entry, middleware,
API routes and server functions.

## Route data

Changing a route's `routeData` loads the data of the routes on screen again, without reloading.
The new loader runs; a `cache()` entry that is still fresh answers as before, so change its key
or call `revalidate` if the cached value is what you changed.

## Keeping the edited component's state

By default the component you edited starts fresh: its own signals go back to their initial
values. To keep them, turn on `keepState`:

```ts
// fluixi.config.ts
export default defineConfig({
  vitePlugin: { hot: { keepState: true } },
});
```

Signals and stores are matched by the order the component body creates them. If the new
version creates the same number, each starts from the value the old one had. Components
rendered inside it keep theirs too, matched by their position under it, as long as the same
component is still there.

When the order cannot be trusted, the component starts fresh:

- the body now creates a different number of signals or stores;
- a different component stands at a child's position.

Two signals swapped in the source swap their values, since only the order is known. Signals
created later (in an event handler, an effect, a branch shown after the first render) are not
the body's and are not kept.

To opt one file out, start it with:

```ts
// @refresh reset
```

## Custom elements

An element made with `defineElement` is rebuilt in place on save: the same element on the page,
its props kept, rendered from the new setup. With `keepState` on, its signals are kept as a
component's are.

An element class registered with `defineCustomElement` is updated in place as well. The browser
keeps the first class it was given for a tag, so the new methods move onto that class and each
element renders again. The element itself is not recreated, so its fields keep their values.
Two cases reload the page instead:

- the class has `#private` fields or methods: each save creates new private names, which the
  existing elements do not have;
- the class is registered with `customElements.define` directly rather than through
  `defineCustomElement`.

A field added in the new version is `undefined` on elements created before it, until the page
reloads.

## Turning it off

```ts
// fluixi.config.ts
export default defineConfig({
  vitePlugin: { hot: false },
});
```

Every save then reloads the page. For one file, `// @refresh reload` at its top does the same.

## In the devtools

Each swap is one commit in the devtools timeline, named after it: `hot update: Card
(src/components/card.tsx)`. The effects that ran and the nodes created and disposed are listed
under it. The elements it rebuilt are outlined on the page for a moment.
