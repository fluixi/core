---
"@fluixi/core": patch
---

`LinkProps` accepts what `Link` forwards.

`Link` forwards every prop it does not handle itself onto the `<a>` — id, style,
title, `aria-*`, `data-*`, event handlers — deliberately allow-by-default so a
polymorphic `as={Link}` keeps its styling hooks. The type did not say so, and
`<Link onClick={…}>` was a type error on a prop that works at runtime.
