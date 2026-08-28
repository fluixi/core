---
"fluixi": patch
"@fluixi/dom": patch
"@fluixi/jsx": patch
---

Remove the lit-html runtime bridge from the framework — no `lit` dependency remains anywhere. `@fluixi/core` no longer lazily `import('lit')` to register a lit renderer on the client (this was also the "Lit is in dev mode" console warning); `@fluixi/dom` drops `registerLitRender`/`renderLitToNodes` and the `_$litType$`/`_$litDirective$` insert-path branches; `@fluixi/dom` and `@fluixi/jsx` drop their remaining lit type imports (`TemplateResult`/`SVGTemplateResult`/`DirectiveResult`, which were redundant in the render-type unions). Authoring with `` html`` `` templates now goes through the compiled path (`@fluixi/lit` + the compiler's `format: 'lit'`), not a runtime renderer.
