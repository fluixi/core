---
"@fluixi/dom": patch
---

Keep getter-backed props reactive when applied to native elements. `spread` and `applyProps` read each prop once (`const value = props[key]`) and only wired an effect when the value was a function. A component prop compiles to a getter — `get value() { return sig().toUpperCase() }` — whose current result is a plain value; forwarded to a native element through `{...rest}` (splitProps) or the jsx runtime, it was snapshotted once and never updated (the DOM only refreshed if you wrote `value={() => sig()...}` to make the value itself a function). Both paths now re-read `props[key]` inside a render effect for non-function values, so the getter's dependencies are tracked; function accessors keep their existing path (no double-wrapping) and static values run once. Covers the property/attribute path plus the `value`/`checked`/`select` special cases (focus guard and the select microtask defer preserved).
