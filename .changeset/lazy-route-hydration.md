---
"@fluixi/dom": minor
"@fluixi/core": patch
---

Lazy-route hydration + hydration correctness fixes.

- **Lazy-route hydration** — a `lazy()` component loads async, after the synchronous
  hydration pass, so it used to render a fresh, duplicate subtree next to the un-hydrated
  server one. `lazy()` now captures its server-DOM position (`captureHydrationCursor`) and
  resumes hydration there when the module resolves (`runHydrationAt`), reusing the server
  DOM in place. `hydrate()` keeps resource seeding (`__FX_DATA__`) active after the sync
  pass so lazy-route resources still seed.
- **Text-ordering fix** — an empty-text positioning marker (`createTextNode('')` from
  `insert`) was consuming and blanking the adjacent server content node during hydration,
  reversing siblings (`text <small>…` → `<small>…text`). Empty markers are client-only
  anchors and are now created fresh, never consuming a server node. (Fixes a general
  hydration-ordering bug, not just lazy.)
- **`<Form>`/`<Link>` read `children` once** — the compiler's `children` getter builds
  fresh nodes on every access, so reading it twice produced duplicate nodes.

New `@fluixi/dom` exports: `captureHydrationCursor`, `runHydrationAt`. Auto-hydration of
SSR'd apps stays opt-in pending a remaining component-children duplication.
