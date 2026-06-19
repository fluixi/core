---
"@fluixi/start": minor
---

Support `fluixi.config.ts` (TypeScript config). `loadConfig` now probes
`fluixi.config.{ts,mts,mjs,js}` and bundles a TypeScript config on the fly with
esbuild (bare imports kept external so `import { defineConfig } from '@fluixi/start'`
and node builtins resolve from the app; relative imports are bundled in), then
imports it and cleans up the temp file. Plain ESM configs still import directly, and
no config at all still works (every field has a default).
