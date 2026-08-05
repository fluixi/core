---
"@fluixi/dom": patch
---

Type the remaining attributes as `Reactive<>`.

Thirteen attributes — including `id`, `title`, `href`, `src`, `disabled`,
`checked` and `placeholder` — were written by hand as `T | Accessor<T>` while
every other attribute uses `Reactive<T>`. The difference is that `Reactive<T>`
permits `undefined`, which is how an attribute is omitted reactively:
`() => (cond ? value : undefined)` removes it, because `setAttribute` already
drops an attribute on `undefined`/`null`/`false`.

So the most commonly bound attributes were the ones that couldn't be omitted
without a cast — the same gap `style` had. Widening only accepts more, so nothing
that compiled before stops compiling.

`SVGAttributes` had the same split inside one interface: its presentation
attributes were already `Reactive<>`, but the core `id`, `className`, `style`,
`lang` beside them were not — so an SVG could animate its `fill` while being
unable to compute its `id`. `style` there also had no accessor form at all.
