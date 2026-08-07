---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

Keep template-cloned elements when a hole receives an array

`reconcileArrays` clones any node that already has a parent other than the target, so a
module-hoisted static element is never stolen from its current owner. A DocumentFragment
is not that kind of owner: `cloneTemplate` hands back the clone still inside its fragment,
so every template-cloned element arrived with a non-null parent and was cloned again.
`cloneNode` copies attributes but not event-handler properties, so the live DOM ended up
holding handler-less copies while the wired-up nodes were discarded, unconnected.

It took `templateClone` (for the fragment parent), `partialTemplates` (for the hole) and
two siblings (so the hole received an array) — the default combination on the IR codegen.
A single child takes a different insert path and always worked, which is why a component
library hit this and the framework's own tests did not.

With that fixed, `codegen` defaults to `'ir'` again.
