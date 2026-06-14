---
"@fluixi/compiler": patch
---

Fix the imperative `{props.children}` async bug: lazy/`<Suspense>` content threaded
through a child component's `{props.children}` rendered empty. Two causes, both in
the inline codegen:

1. `.children` member access compiled to a reactive `() => props.children` thunk,
   which fully unwrapped the child's Suspense/memo to a static node and severed
   the reactive binding. It's now non-reactive, so `insert` binds the child's own
   memo (like a directly-rendered `<Outlet/>`).
2. JSX whitespace between elements (e.g. `<Shell>\n  <Suspense/>\n</Shell>`) was
   kept as a `" "` text node, turning `props.children` into an array `[" ", memo,
   " "]` — and an array insert doesn't reactively bind a memo/component inside it.
   Now uses canonical JSX whitespace cleaning (drops newline-spanning whitespace,
   as React/Solid do), so a lone child stays lone. The IR codegen path is kept in
   sync (identical output).
