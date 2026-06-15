---
"@fluixi/dom": patch
---

Dev-only hydration mismatch detection. When `hydrate()` walks the server DOM and
the cursor node diverges from what the client builds (different tag/type), it logs
a warning pointing at the likely cause (non-deterministic render, browser-only
branches, untransported data). Tree-shaken out of production via
`process.env.NODE_ENV`, so it costs nothing in prod. Only warns on a present-but-
wrong node; empty-text insertion markers (which the server serializes to nothing)
are not flagged.
