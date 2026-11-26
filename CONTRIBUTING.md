# Contributing to Fluixi

Thanks for taking the time to help. Bug reports, fixes, docs and examples are all welcome.

Fluixi is in alpha. Before starting on a large change or a new API, open an issue so we can agree on the shape first.

## Setup

You need Node 20 or later and pnpm 10.

```sh
git clone https://github.com/fluixi/core.git
cd core
pnpm install
pnpm nx run-many -t build
```

Work happens on the `alpha` branch. Open pull requests against it.

## Workspace

This is an [Nx](https://nx.dev) and pnpm workspace. Each package lives in `packages/<name>`, and runnable apps live in `examples/`.

| Task | Command |
| --- | --- |
| Build everything | `pnpm nx run-many -t build` |
| Test one package | `pnpm nx test @fluixi/<name>` |
| Typecheck one package | `pnpm nx typecheck @fluixi/<name>` |
| Only what you changed | `pnpm nx affected -t build test typecheck` |

Tests run with Vitest. `test` does not typecheck spec files, so run `typecheck` too: CI runs both.

Some packages read another package's built output at config time (a `vite.config.ts` import resolves to `dist`). If a change in one package does not show up in another, rebuild the first.

## Making a change

- A bug fix comes with a spec that fails without it.
- A new feature comes with specs and, when it changes what users write, an update to the docs in `docs/`.
- Keep a pull request to one change. Unrelated fixes go in their own.
- Code is TypeScript in strict mode. Comments explain why, not what.

## Changesets

Every change to a published package needs a changeset:

```sh
pnpm changeset
```

Pick the packages you touched and the bump, then describe the change from a user's point of view. The text becomes the changelog entry.

Docs, examples, tests and CI changes need no changeset.

## Commit messages

Write the subject as a short sentence in the imperative, without a type prefix:

```
Keep focus when a keyed row moves
```

Add a body when the reason is not obvious from the diff.

## Pull requests

Describe what changed and how you checked it. CI runs build, test and typecheck on every pull request and must pass before merging.

## Reporting bugs

Use the bug report template, and include a minimal reproduction: a link to the [playground](https://playground.fluixi.com) or a small repository. Security issues go through [SECURITY.md](./SECURITY.md), not public issues.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
