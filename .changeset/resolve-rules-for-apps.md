---
"@fluixi/start": minor
"@fluixi/cli": minor
"create-fluixi": minor
---

Let an SSR app configure component resolution, and stop making people hand-write it.

`fluixi.config.ts` had no seam for it — `createVitePlugin()` was called with no options
— so an SSR app couldn't say where an unimported tag comes from at all. `resolve` is a
config field now and reaches the compiler.

The scaffolded apps carry one pattern rule covering `src/components`, so a generated
component works as a tag with no config edit, ever:

```ts
resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }]
```

`fluixi g component` prints that line when a project has no rule yet, and stays quiet
when it does. It reads the config and never writes it: a config is arbitrary
TypeScript, and editing it means reprinting someone's file.
