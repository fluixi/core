---
"@fluixi/core": patch
---

Show a Suspense boundary's fallback when a lazy child appears after the first
render.

Navigating client-side to a route whose chunk isn't loaded yet fetched the chunk
and then mounted nothing: no fallback, no content, no error — an empty node. The
boundary tracks its children in a render effect so a suspended read is reported
to it rather than to whatever effect happens to be running, but that effect only
read the outer accessor. A component child arrives as a thunk, and the compiler
wraps a dynamic child in its own memo, so the lazy component was never
instantiated under the boundary at all. It ran later, downstream of the output
memo, where a suspend has nothing that can re-run it.

The children now go through `readChildren` — thunks unwrapped, signals left
reactive, memoised so the tracking effect and the output share one instantiation
— and the effect follows nested accessors. Hydration is unaffected: a route
preloaded before hydrating still resolves synchronously and adopts the server
DOM.
