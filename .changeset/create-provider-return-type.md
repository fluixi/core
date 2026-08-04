---
"@fluixi/core": patch
---

Fix `createProvider`'s return type.

It was annotated `Component<T>` but returns `context.Provider({…})` — the rendered
output, not a component. So the documented wrapper pattern failed to type-check:

```tsx
const ThemeProvider = (p) => createProvider(ThemeCtx, 'dark', p);
<ThemeProvider>…</ThemeProvider>  // TS2786: not a valid JSX element
```

Now returns `ComponentChild`, the framework's renderable type from `@fluixi/dom`,
which keeps core free of any JSX-authoring dependency — `html` templates and JSX
both consume it.
