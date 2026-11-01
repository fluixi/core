---
"@fluixi/reactive": patch
"@fluixi/dom": patch
---

Per-row state is now built only when it is used: `@fluixi/reactive` creates the row index signal on first read and builds reactive node reports only when an observer is registered, and `@fluixi/dom` builds the insert component cache on the first component thunk.
