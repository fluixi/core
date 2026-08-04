---
"@fluixi/ts-plugin": minor
---

Check templates on one program instead of two.

Deep template checking ran a second `ts.LanguageService`. A second service means a
second document registry, so `lib.d.ts` and every `node_modules` declaration — the
expensive part — were parsed and bound twice.

Now each file containing templates gets a shadow file added to the existing
program: a copy of the source with html`` replaced by typed helper calls. Locals
stay in scope because the shadow copies the whole file, and lib/node_modules are
parsed once because there is one program. The plugin no longer calls
`createLanguageService` at all.

The real file keeps real positions. Replacing its text — the way Volar does for
`.vue`, where TypeScript can't read the source at all — would mean every language
service API speaks generated coordinates, and a single unmapped one
(`getFormattingEditsForDocument`, `findRenameLocations`) applies edits at the wrong
offsets. Here only diagnostics explicitly requested on the shadow are mapped back.

Shadow files are filtered out of references, rename locations, definitions,
implementations and document highlights, and report no diagnostics of their own,
so nothing about them reaches the editor.
