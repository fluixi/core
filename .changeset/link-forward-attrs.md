---
"@fluixi/core": patch
---

Router `Link` now forwards arbitrary author attributes onto its `<a>`.

Previously `Link` only applied `href`, `slot`, `class`/`className` and the
`active`/`activeClass` pair — every other prop (`id`, `style`, `title`, `role`,
`data-*`, `aria-*`, …) was silently dropped. That broke any component composed via
`as={Link}` (polymorphic): e.g. `@fluixi-ui`'s `<SidenavLink as={Link}>` lost its
`data-sidenav-link` styling hook and inline styles, so it rendered unstyled with no
hover. `Link` now forwards the rest onto the `<a>` (matching how `Form` already
does), skipping only the props it owns.
