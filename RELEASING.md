# Releasing

How to publish `@fluixi/*` packages to GitHub Packages **entirely from the terminal**: no GitHub web UI needed.

We use [Changesets](https://github.com/changesets/changesets) with a **two-phase, PR-based** flow:

```
 you: add a changeset ──► push to main
                              │
                       CI opens a "Version Packages" PR  (phase 1: versioning)
                              │
 you: merge that PR (gh) ─────┤
                              │
                       CI builds & publishes             (phase 2: publish)
```

The PR is a review checkpoint: you see the version bumps + changelogs before anything goes public. Publishing only happens **after the PR is merged**.

---

## Prerequisites (one-time)

```bash
# GitHub CLI, logged in
gh auth status   # or: gh auth login

# Local npm auth for reading the registry (optional, for `npm view` checks).
# ~/.npmrc should contain a line like:
#   //npm.pkg.github.com/:_authToken=<your PAT with read:packages>
```

The CI side needs the repo/org secret **`PACKAGES_TOKEN`** (a classic PAT with `repo`, `read:packages`, `write:packages`). Already configured.

---

## The full release, step by step

### 1. Record what changed: add a changeset

```bash
pnpm changeset
```

This is interactive:
- **Select packages** to bump: use `space` to toggle, `enter` to confirm.
- **Choose the bump type**: `patch` (0.0.x), `minor` (0.x.0), or `major` (x.0.0).
- **Write a summary**: this becomes the changelog entry.

It writes a file under `.changeset/`, e.g. `.changeset/funny-otters-sing.md`:

```markdown
---
"@fluixi/core": patch
---

Fix debounced signal subscriptions
```

> ⚠️ **Fixed group:** in this repo all publishable packages are in one `fixed`
> group (see `.changeset/config.json`). Whichever package you select, **they all
> bump together to the same version**. See [One package vs all](#one-package-vs-all-packages) below.

You can also write the file by hand instead of using the prompt: same format.

### 2. Commit & push

```bash
git add .changeset
git commit -m "Add changeset"
git push
```

### 3. Watch CI open the version PR

```bash
# watch the Release run that fires on your push
gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

When it finishes, list your open PRs: the **"Version Packages" PR** will be there:

```bash
gh pr list
# NUMBER  TITLE                   BRANCH                  STATE
# 2       chore: version packages changeset-release/main  OPEN
```

The **first column is the PR number** (here, `2`). That number is what every
following command uses: the branch name (`changeset-release/main`) is just info.

Inspect it without leaving the terminal:

```bash
gh pr view 2      # release notes / summary
gh pr diff 2      # exact version bumps + CHANGELOG entries
```

### 4. Merge the version PR (this triggers the publish)

```bash
gh pr merge 2 --squash --delete-branch
```

> Replace `2` with whatever number `gh pr list` showed.
> Add `-R <owner>/<repo>` (e.g. `-R fluixi/wc`) **only** if you're not currently
> inside that repo's folder.

### 5. Watch the publish & verify

```bash
# the merge triggers a second Release run — watch it
gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')"

# confirm the new versions are live
npm view fluixi version --registry=https://npm.pkg.github.com/
```

Done: packages are published.

---

## One package vs all packages

### All packages (the normal case here)

Because every package sits in the **`fixed` group**, a single changeset bumps and
publishes the **whole group** at once. That's the default behavior: just add one
changeset and follow the steps above.

### Only some packages

If you remove the `fixed` group (or in a repo without one), Changesets publishes
**only the packages you select** in `pnpm changeset` plus any package that depends
on them. `changeset publish` always skips versions already on the registry, so
untouched packages are never re-published.

To make a package versionable on its own, drop it from `fixed` in
`.changeset/config.json`:

```jsonc
// .changeset/config.json
{
  "fixed": [["@fluixi/utils", "@fluixi/reactive"]],  // smaller group, or [] for fully independent
  "ignore": ["@fluixi/webui", "@fluixi/core-test"]
}
```

### Publish a single package right now (escape hatch, no PR)

For a one-off manual publish that bypasses the changeset flow entirely:

```bash
# 1. bump the version in the package's package.json (e.g. 0.0.1 -> 0.0.2)
# 2. build it
pnpm nx build @fluixi/utils
# 3. publish from its folder (publishConfig routes to GitHub Packages)
cd packages/utils && npm publish
```

The version must not already exist on the registry, and `~/.npmrc` must hold a
`write:packages` token. Use this only for hotfixes: prefer the changeset flow so
changelogs and tags stay correct.

---

## Bump types

| Change | Bump | Version |
|---|---|---|
| Bug fix, README, internal | `patch` | `0.0.1 → 0.0.2` |
| New backwards-compatible feature | `minor` | `0.1.0 → 0.2.0` |
| Breaking change | `major` | `1.0.0 → 2.0.0` |

---

## Useful commands

```bash
# what's staged for the next release (pending changesets)
pnpm changeset status

# list recent release runs
gh run list --workflow=release.yml --limit 5

# see all versions of a package on the registry
npm view @fluixi/dom versions --registry=https://npm.pkg.github.com/

# find the open version PR
gh pr list --head changeset-release/main
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Release run fails: *"GitHub Actions is not permitted to create or approve pull requests"* | `PACKAGES_TOKEN` secret missing or not used by the workflow. It must be a classic PAT (`repo` + `read/write:packages`). |
| Version PR created but nothing published | Publishing only runs **after** you merge the PR. Merge it (step 4). |
| `changeset publish` says *"already published"* | That version is already on the registry: add a changeset to bump again. |
| Package published but not shown under the repo's **Packages** | Its `repository` field must point to this repo; the link is set at **first** publish. See team notes on re-linking. |
| Install fails reading `@bambiste/*` | The token needs `read:packages` for the `@bambiste` scope (cross-account). |
