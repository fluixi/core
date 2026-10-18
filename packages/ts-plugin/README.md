# @fluixi/ts-plugin

A TypeScript language-service plugin that gives `` html`...` `` templates the same editor
support JSX gets.

## The problem

TypeScript sees a tagged template as an opaque string. Everything inside it falls off the
map: a component referenced only by tag is reported "declared but never used", a callback
param is an implicit `any`, nothing completes, hover says nothing, and go-to-definition
lands on the template literal instead of the component.

```ts
function UserCard() { /* … */ }

const app = html`<main><UserCard /></main>`;
//                      ^ greyed out — TypeScript never counted this as a reference
```

Authoring in `` html`` `` shouldn't cost you the editor.

## What you get

Reparse the template with [`@fluixi/template-parser`](../template-parser), map every tag and
hole back to a real source position, and ask the program's own checker about it:

- **Hover**: a component tag shows its signature, a prop shows its declared type, an
  element attribute shows what it takes, and an inferred callback param (`each`, `event`,
  `ref`, `use`, `Show`) shows the type it was inferred to.
- **Completion**: component prop names inside a tag, element attributes on an intrinsic
  tag, and members of an inferred param (`it.`, `el.`, `e.`).
- **Navigation**: go-to-definition, find-all-references and rename work through tags.
  Rename only adds tags when TypeScript's own rename succeeded, so you never get a
  rewritten `<Tag>` with a stale `</Tag>`.
- **Diagnostics**: a bare accessor in a template (`` html`<p>${count}</p>` ``) is flagged,
  since it renders the function once and never updates; a property that doesn't exist on an
  inferred param is reported.
- **Quiet where it should be**: unused-component reports and implicit-`any` noise on params
  the template can infer are dropped.
- **Quick fixes**: "Call `count`" for a bare accessor, with a fix-all for the file.

## Enable it

Add it to your project's `tsconfig.json` and use the **workspace** TypeScript version
(VS Code: `TypeScript: Select TypeScript Version → Use Workspace Version`: tsconfig plugins
only load under the workspace TS):

```jsonc
{
  "compilerOptions": {
    "plugins": [{ "name": "@fluixi/ts-plugin" }]
  }
}
```

Nothing else. JSX needs no plugin, and neither do the `$signal`-style intrinsics: those are
typed by the `fluixi.d.ts` the compiler generates.

## How it stays out of the way

Everything is computed on the **existing** program's checker. The plugin creates no language
service, adds no files, and never touches the host: it wraps the service it's handed, and
every addition is wrapped so a failure costs the extra information, never the real answer.

That restraint is deliberate. Two earlier designs for deep type-checking inside `${...}` holes
both had to go: a second `ts.LanguageService` meant a second document registry, so lib.d.ts
and node_modules were parsed twice; and shadow files added via `getScriptFileNames` re-entered
host machinery on every project sync and crashed the language service outright. Hole
diagnostics weren't worth either: a `${...}` hole is a real expression, so TypeScript already
checks it.

## License

MIT
