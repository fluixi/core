---
'@fluixi/jsx': patch
'@fluixi/vite-plugin': patch
'@fluixi/compiler': patch
'@fluixi/core': patch
'@fluixi/reactive': patch
'@fluixi/example-counter': patch
'@fluixi/example-router': patch
'@fluixi/server': patch
'@fluixi/babel-plugin-jsx': patch
'@fluixi/utils': patch
'@fluixi/example-todo': patch
'@fluixi/example-ssr': patch
'@fluixi/dom': patch
---

---

"@fluixi/core": patch

---

Tidy fluixi internals: remove the dead `dev-server/` and `builder/` stubs and
~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
`rs`/`rt`) — all unexported and unimportable. No public API change.
