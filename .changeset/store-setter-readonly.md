---
"@fluixi/reactive": patch
---

Let a store setter take the readonly value a store hands back.

Reading a store gives a deeply readonly view, so `set(untrackStore(other))` — the
ordinary way to seed one store from another, or to reset from a snapshot — was rejected
by the types for a call the setter handles fine: it copies values out of what it is
given and never writes to it. Every such site needed a cast.

`UpdateValue` and the path overload accept the readonly form now, and `Immutable<T>` is
defined in terms of the same `DeepReadonly<T>` the setter takes, so the two cannot
describe different shapes.
