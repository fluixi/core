---
"@fluixi/compiler": patch
---

Fix `codegen: 'ir'` skipping resolution, and drop a dead import

Under `codegen: 'ir'` a resolved tag compiled to a bare reference with no import and threw
at runtime — the IR path never ran the resolve pass. It now runs the same passes as the
`html\`\`` path. `load:` was also read as an ordinary attribute there, so the directive
reached the props object as `get "load:visible"()`.

The IR path also emitted `import { jsx, jsxs, Fragment } from '@fluixi/jsx'` into every
file, which it never uses. `backend: 'jsx'` is unaffected.
