---
"@fluixi/compiler": minor
---

Turn `propsDestructure` on by default.

A component can take its props apart the plain way and the bindings stay live reads;
`...rest` becomes the `splitProps` call you would have written. What the rewrite can't
prove safe it leaves as written and reports.

**Turn it off for a package that ships its source** for consumers to compile — an
`exports` entry pointing at `.ts`. The rewrite is a property of how code is compiled,
so a consumer without the option would read those props once. Compiled output is fine
either way.
