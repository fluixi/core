---
"@fluixi/auth": patch
---

`Can` and `Protect` can be used in a template. They declared `children: unknown` and returned `() => unknown`, which JSX refuses: a component that cannot go in a template is not one. They now take and return `ComponentChild`, the same shape the control flow components use, so both JSX and `html` accept them.

With no `fallback`, a denied guard yields `null` rather than `undefined`, which renders as nothing in one path and as a word in the other.
