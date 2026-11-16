---
"@fluixi/compiler": patch
"@fluixi/template-parser": patch
---

An imported component that has a `load:` and also a use without `load:` in the same file now treats both uses as eager, as with a resolve rule. A warning now appears when `load:never` is placed next to an eager use of the same component. When `load:` is used on `NS.default`, the message now names the namespace import. In HTML templates, a hole in a `load:` value is now refused like JSX, and using `load:` on `<${Chart}>` now prompts a message to write the bare tag.
