---
"@fluixi/dom": patch
---

Type `style` as `Reactive<>`, like every other attribute.

It was `string | CSSProperties | Accessor<string | CSSProperties>`, so an accessor
could not return `undefined` — making `style` the one attribute that couldn't be
omitted reactively. `setStyle` already removes it on `null`/`undefined`, so only
the type disagreed.

This blocks any component that forwards a computed style, since "no style" has to
be expressible.
