---
'@fluixi/dom': patch
'@fluixi/core': patch
---

Fix `ComponentChild` being `any`, which disabled type checking at every component boundary

The union ended in `| any`, and a union containing `any` *is* `any`. Every component
return, every `children`, and every render prop's parameter was silently untyped —
`<Pressable>{(state) => ...}</Pressable>` gave `state: any`.

`FxElement` (`JSX.Element`) is now the same type rather than a parallel copy that had
drifted, and an html`` `TemplateResult` is assignable to a renderable value. Build-time
assertions keep both from regressing.

Also: `createDynamicElement` infers what it builds — `'div'` → `HTMLDivElement`,
`'circle'` → `SVGCircleElement`, a component → its own return type — instead of `any`.
