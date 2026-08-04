---
"@fluixi/template-parser": minor
---

Accessibility warnings, and a consistent event name.

Five structural rules over the template AST: an `img` with no `alt`, an `a` with
no `href`, an `iframe` with no `title`, a positive `tabindex`, and a click handler
on an element that isn't keyboard-reachable. They live in the parser rather than
in a consumer because the language service and the compiler both parse templates,
so one implementation reaches the editor and the build.

Every rule is structural — no types, no scope analysis. A rule that cannot be
certain stays silent: anything carrying a spread is skipped entirely, since the
spread may supply the very attribute being looked for. An accessibility warning
that cries wolf gets switched off, and then the real ones are lost too. All are
warnings; none make a template invalid. Opt out with `accessibility: false`.

`EventBindingNode.name` is now the DOM event name whatever the spelling. It was
documented as lowercased but only was for `@click` and `on:click` — `onMouseDown`
produced `MouseDown`. Compilation was unaffected because lowering lowercases
defensively, so this only ever bit a consumer that trusted the documented
contract. `syntax` still records which form was written.
