---
"@fluixi/core": minor
---

i18n: typed translation keys. `t('…')` now autocompletes the valid keys from your `messages`
and the editor flags typos — derived with a `MessageKey<M>` type that produces the **leaf**
key union: flat keys (`'welcome'`), flat dotted keys (`'nav.dashboard'`), nested dot-paths
(`'cart.items'`), and plural leaves — but not intermediate branch keys (which would render
`[object Object]`). `createI18n` infers the message shape (a `const` type parameter), so no
annotation or `as const` is needed. Backward compatible — `t` still accepts any `string` for
dynamic keys.
