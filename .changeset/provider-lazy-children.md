---
"fluixi": minor
---

`createProvider` gets a lazy-safe overload so a provider can wrap an `<Outlet/>`
without losing context under SSR.

The old form `createProvider({ context, value, children })` reads `children` when
the object literal is built — i.e. before the reactive Provider stamps its context.
With an `<Outlet/>` among siblings (e.g. a layout `<P><Navbar/><main><Outlet/></main><Footer/></P>`),
the route subtree then renders in an owner root disjoint from the provider, so route
descendants get `undefined` from `useContext`.

New form reads `children` through a getter, inside the stamped scope:

```ts
function ThemeProvider(props) {
  return createProvider(ThemeContext, theme, props); // children stays lazy
}
```

The old `{ context, value, children }` form still works but is deprecated (one-time
dev warning); prefer the 3-arg form or JSX `<Ctx.Provider value={…}>{props.children}</Ctx.Provider>`.
Internal `createContextWithProvider`/`composeProviders` now use the lazy form too.
