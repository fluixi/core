# Props

Components here destructure their props the way you would in plain JavaScript:

```tsx
function Field({ label, ...rest }) {
  return (
    <label>
      <span>{label}</span>
      <input {...rest} />
    </label>
  );
}
```

With `propsDestructure` on (see `vite.config.ts`), the compiler rewrites each binding
back into a read of the props object, so `label` stays live instead of being copied once
at call time. `...rest` becomes the `splitProps` call you would have written by hand,
which carries the remaining props over as getters — so a signal behind a forwarded prop
still reaches the element.

Covered here: shorthand bindings, aliases, defaults (only for `undefined`, as in JS),
nested patterns, and rest.

```bash
pnpm test        # the assertions below
pnpm dev         # click the buttons and watch the labels change
```

Turn the option off in `vite.config.ts` and the reactivity tests fail while the
structural ones still pass — that difference is the feature.
