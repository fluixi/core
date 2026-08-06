---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

Mark holes in partial templates so all three environments share one shape

Holes used to be omitted from the template, with content inserted before the next static
sibling. That described the template but not the server DOM, which also contains the
rendered hole content — so the generated `firstChild`/`nextSibling` paths were only valid
on a fresh clone, and the walk could not be trusted during hydration.

Each hole now leaves an empty comment. The clone, the server's markup and the DOM being
hydrated then have identical shape, and one set of paths addresses all three. The server
parser keeps comments for the same reason.

It also removes a restriction: `a ${x} b` is now templatable. Omitting the hole made the
surrounding texts merge, leaving nothing to insert between; a marker keeps them apart.

`examples/ssr` compiles with `partialTemplates: true` so the shapes most likely to break —
text holes with static text either side, several holes in one element, a hole followed by
a static sibling — are exercised against real SSR and hydration on every run.

`partialTemplates` stays off by default. Structure is now reconciled, but the hydration
*cursor* is not: text hole content is recreated rather than adopted, with a mismatch
warning. Output is correct and nothing duplicates; the remaining work is paired
start/end markers so the runtime can adopt a hole's existing nodes exactly.
