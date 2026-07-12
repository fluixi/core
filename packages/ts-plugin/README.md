# @fluixi/ts-plugin

A TypeScript language-service plugin that teaches `tsserver` about Fluixi
`` html`...` `` templates.

## The problem

TypeScript sees a tagged template as an opaque string. A component referenced
only by tag inside a template —

```ts
function UserCard() { /* … */ }

const app = html`<main><UserCard /></main>`;
```

— is never counted as a reference, so `UserCard` is reported as **"declared but
never used"** and greyed out, even though it's used.

## The fix

This plugin proxies the language service, reparses each `` html`` ``/`` svg`` ``
template with [`@fluixi/template-parser`](../template-parser), collects the
component tag names, and drops the "unused" diagnostics for those bindings — for
both local declarations and imports.

## Enable it

Add it to your project's `tsconfig.json` and use the **workspace** TypeScript
version (VS Code: `TypeScript: Select TypeScript Version → Use Workspace
Version`, since tsconfig plugins only load under the workspace TS):

```jsonc
{
  "compilerOptions": {
    "plugins": [{ "name": "@fluixi/ts-plugin" }]
  }
}
```

## License

MIT
