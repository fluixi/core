---
"@fluixi/compiler": minor
---

Add `propsDestructure`. With it on, a component can take its props apart the
plain way and the compiler rewrites the bindings into reads, so they stay
reactive:

```tsx
function Hello({ name, tone = 'calm' }) {
  return <p data-tone={tone}>{name}</p>;
}
```

Each use compiles to `props.name`, so the binding keeps its type and nothing else
about the function changes. `...rest` becomes the `splitProps` call you would have
written, which carries the remaining props across as getters. Aliases, defaults
and nested patterns work; a default still applies only to `undefined`.

Anything the rewrite can't prove is left exactly as written and reported — a
reassigned binding, a computed key, a default that would have to re-run on every
read.

Off by default. It's a property of how code is compiled, so a package that ships
its source for others to compile should keep writing props explicitly.
