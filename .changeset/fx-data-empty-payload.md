---
"@fluixi/dom": patch
---

Don't ship an empty `__FX_DATA__` script.

A resource can resolve to something JSON cannot carry — most often a lazy route's
module, where the resource value *is* the component function. That entry passed
the "is there any data?" check (it is a real entry in the map) and then vanished
inside `JSON.stringify`, so the document carried
`<script type="application/json" id="__FX_DATA__">{}</script>`: a data transport
with nothing in it, on every page whose only resource was a lazy import.

`serializeResourceData` now skips values JSON cannot represent, and decides
whether to emit on the *serialized* payload rather than on the map — so a nested
`undefined`, or a class whose `toJSON` returns nothing, cannot resurrect the
empty script either.
