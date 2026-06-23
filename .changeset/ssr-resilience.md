---
"@fluixi/server": patch
---

SSR resilience: a failing backend request no longer blanks the page.

- `preloadServerState` now catches a throwing isomorphic `server` resolver (e.g. the
  backend is down/restarting): it logs, leaves the state at its fallback, and lets the
  render continue (and the client resolve/retry after hydration) instead of rejecting
  the whole render.
- `renderToStream` / `renderToBodyStream` no longer `controller.error()` on a render
  failure (which truncated the already-flushed document into a blank page). They emit an
  EMPTY body and close the document cleanly — so it stays well-formed and, with no
  `__FLUIXI_HYDRATION__` marker present, `startClient` does a full CLIENT render (CSR
  fallback). A transient SSR/backend failure degrades to client rendering, never a blank.
