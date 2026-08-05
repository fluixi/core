---
'@fluixi/compiler': minor
---

Resolve unbound component tags to modules, so a component can be used without an import

The framework already auto-imported `Suspense`/`Portal`/`Router`, but through a
hardcoded name set inside the Babel plugin — not extensible by a UI library or an
app. `resolve` makes that configurable:

```ts
fluixi({ resolve: [
  { components: { Button: '@fluixi-ui/button' } },
  { match: /^Icon(.+)$/, module: '@/icons/$1', export: 'default' },
]})
```

`html`<Button>Save</Button>`` and `<Button>Save</Button>` then compile identically
with no import written by hand. Resolution is by *name*, below the syntax layer, so
parity between the two syntaxes is structural rather than maintained by hand.

- A lexical binding always wins — an explicit import or a local of the same name is
  never overridden, so enabling this cannot change what an existing file means.
- Components from one module share a single injected import.
- A name claimed by two rules with different targets is reported as a conflict rather
  than resolved first-rule-wins: with a map of ~80 common words (`Card`, `Table`,
  `Text`), a working import of the *wrong* component is far harder to debug than an
  error.
- With no `resolve` rules, behaviour is exactly as before.

`createComponentResolver` is exported so the TS plugin can synthesise the same import
for hover/go-to-definition/rename, and a codemod can materialise imports back into
source. Keeping resolution a pure `name -> { module, export }` function is what lets
those consumers agree.
