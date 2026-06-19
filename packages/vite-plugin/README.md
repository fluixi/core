# @fluixi/vite-plugin

The Vite plugin for Fluixi. It sets the esbuild `jsxImportSource` and runs the
Fluixi JSX transform (via `@fluixi/compiler`), with a choice of codegen backend.

```ts
import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      // 'jsx' (default) emits jsx()/jsxs(); 'imperative' compiles straight into
      // @fluixi/dom runtime calls (createNativeElement/spread/insert/...).
      backend: 'jsx',
    }),
  ],
});
```

Options are `@fluixi/compiler`'s `CompilerOptions` (`importSource`, `backend`,
`signalModule`, `controlFlowModule`, `delegateEvents`, `sourceMaps`, …).

`@fluixi/core` re-exports `fluixi`/`createVitePlugin` from here.
