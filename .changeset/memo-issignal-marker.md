---
"@fluixi/reactive": patch
---

Fix control-flow reactivity on the TC39 signal core: stamp `$SIGNAL` on `createMemo`
accessors.

The compat `createMemo` only marked its accessor with `$MEMO`, not `$SIGNAL`, so
`isSignal(memo)` returned `false` (the legacy `createMemo` stamped both). The DOM
runtime's `insert()` relies on `isSignal` to recognise a control-flow memo
(`For`/`Switch`/`Index`/`Dynamic`) as reactive; without it the memo fell into the
component cache and was frozen after first render — initial output was correct but
updates never applied. Stamping `$SIGNAL` (matching the legacy memo) restores
fine-grained updates for all control-flow components. Fixes the 10 `@fluixi/compiler`
imperative-fixtures failures.
