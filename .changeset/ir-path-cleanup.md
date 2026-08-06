---
"@fluixi/compiler": patch
---

Drop the unused JSX runtime import from `codegen: 'ir'` output

The IR path produces `@fluixi/dom` runtime calls, never JSX factory calls, but fell
through to the automatic-runtime branch and emitted
`import { jsx, jsxs, Fragment } from '@fluixi/jsx'` in every compiled file. Dead in the
bundle, and it made the two codegen paths differ for no reason. `backend: 'jsx'` is
unaffected.
