---
"@fluixi/reactive": minor
"fluixi": patch
"@fluixi/dom": patch
---

Fix resource ids shifting between the first request for a route and the next.

A resource id is a position in a per-render sequence, and the client re-derives
it by counting resources in the same order. `lazy()` broke that. Its module-load
resource is created on the cold path only, and on the server the module stays
loaded after the first request — so the first visitor after a restart got the
page's own data under `r1` and everyone after them got `r0`, while the client,
which preloads routes before hydrating, always counted from `r0`.

One of the two had to be wrong. In practice the first visitor after every deploy
was served data keyed to an id their client never looked up: the resource fell
back to fetching on the client, so that visitor paid a request the page had
already answered, and saw whatever the loading state renders.

`ResourceOptions` gains `transport?: boolean`. `false` opts a resource out of the
`__FX_DATA__` transport *and* out of the id sequence — the two have to move
together, since an id consumed on one side only shifts every id after it.
`lazy()` uses it: the value there is the component function, which never
travelled to the client anyway, and the client re-imports the chunk itself.

Both `createResource` implementations take the option — the live one in
`graph/resource.ts` and the legacy `@fluixi/reactive/signal-legacy` — so the two
cannot disagree about what an id means.
