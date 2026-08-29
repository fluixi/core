---
'@fluixi/vite-plugin': patch
'@fluixi/example-start': patch
'@fluixi/compiler': patch
'@fluixi/devtools': patch
'@fluixi/reactive': patch
'@fluixi/example-counter': patch
'@fluixi/session': patch
'@fluixi/example-router': patch
'create-fluixi': patch
'@fluixi/router': patch
'@fluixi/server': patch
'@fluixi/babel-plugin-jsx': patch
'@fluixi/start': patch
'@fluixi/utils': patch
'@fluixi/example-todo': patch
'@fluixi/auth': patch
'@fluixi/core': patch
'@fluixi/head': patch
'@fluixi/example-ssr': patch
'@fluixi/cli': patch
'@fluixi/dom': patch
'@fluixi/jsx': patch
---

Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
