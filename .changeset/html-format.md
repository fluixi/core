---
"@fluixi/compiler": patch
"@fluixi/dom": patch
"@fluixi/core": patch
---

The `format` compiler option no longer accepts `'lit'` and accepts `'html'` (or `'jsx'` or `'both'`). The lit helpers `isLitResult`, `isLitTemplateResult`, `getLitEventName` and `isTemplateFactory` are removed: they detected lit-html objects, which no longer occur.
