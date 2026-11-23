---
"@fluixi/web-components": minor
---

The `provide` and `consume` methods are removed from class elements; use `provideContext(this, context, value)` and `consumeContext(this, context)` from `@fluixi/web-components` instead. Update any code that calls `element.provide(...)` or `element.consume(...)` to use these functions.
