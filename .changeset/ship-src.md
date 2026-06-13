---
"@fluixi/router": patch
"@fluixi/utils": patch
---

Include `src` in the published tarball (like the other `@fluixi/*` packages).
Consumers that resolve `@fluixi/*` via the `development` export condition (the
TypeScript source — used in dev to keep a single reactive instance) were failing
on `@fluixi/router` / `@fluixi/utils` with "Failed to resolve entry".
