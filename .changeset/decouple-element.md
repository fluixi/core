---
"@fluixi/kettlejs": minor
---

Move web-component support to `@fluixi/element` (now its own repo, wc-element).

`@fluixi/kettlejs` no longer re-exports `defineElement`, `wrapElement`,
`KettleElement`, `KettleLitElement`, `KettleController`, `createComponent`
(`createJsxComponent`), or `kettleElementPlugin`. Import them from
`@fluixi/element` (and `@fluixi/element/plugin`) directly. `@fluixi/element` and
`@fluixi/webui` are no longer published from this repo.
