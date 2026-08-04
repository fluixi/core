---
"@fluixi/jsx": patch
---

Make `JSX.CSSProperties` catch misspelled properties.

It ended with `& { [key: string]: string | number | undefined }`, so every key
type-checked — `style={{ colr: 'red' }}` was accepted silently, and the property
autocomplete the first member provides was unreachable. Custom properties are
already covered by the `--*` member, so the open fallback only removed safety.

Also selects the string-valued members of `CSSStyleDeclaration` rather than
excluding `length` and `parentRule` by name, which additionally drops its methods
and numeric index (`getPropertyValue` was a valid style property before).

Potentially breaking for a style object that sets a property newer than the
TypeScript lib in use; set it as a custom property or widen at the call site.
Checked against the workspace and every example — no new errors.
