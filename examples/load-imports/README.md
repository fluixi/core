# `load:` on your own imports

Two components, imported the same way, both carrying a deferring `load:`. Only one of
them ends up in its own chunk.

```tsx
import { Chart } from './components/Chart';
import { Legend } from './components/Legend';

const widgets = { legend: Legend };      // ← a value reference

<Chart load:visible="200px" />           // deferred: only ever a tag
<Legend load:idle />                     // not deferred: `widgets` names it
```

Deferring replaces your static import with a dynamic one, so the compiler only does it
when the name is used **nowhere but as a tag**. A JSX tag name is a `JSXIdentifier`, so
"no `Identifier` references anywhere in the file" is an exact test rather than a guess.

`Legend` fails it. Handing `widgets` a lazy wrapper instead of the component would change
what it holds, so the import stays and the build says why:

```
[fluixi] src/App.tsx: load:idle has no effect on <Legend>: Legend is used as a value
here, not only as a tag, so its import has to stay — deferring would hand those
references a lazy wrapper instead of the component. Defer it at the point it is
rendered, or keep it eager.
```

There is no `resolve` map in this example. One is only needed for tags you don't import
at all — see `examples/load-strategies` for that shape. Both produce identical output.

```bash
pnpm test    # runs a real `vite build` and reads the chunks
pnpm build
```
