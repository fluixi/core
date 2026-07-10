---
"create-fluixi": patch
---

Fix the SSR template's `tsconfig.json`: it referenced `fluixi.config.mjs` and a
non-existent `vite.config.ts` in `include` (the template ships `fluixi.config.ts`), and
declared `types: ["node"]` without `@types/node` installed. The `include` now matches the
scaffolded files and `@types/node` is added to devDependencies, so a fresh SSR app
typechecks out of the box.
