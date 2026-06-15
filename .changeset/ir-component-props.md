---
"@fluixi/compiler": patch
---

Fix the IR codegen to match inline: component prop *values* are now passed as
values, not `() => …` thunks. Wrapping them handed the component a function
instead of the value — e.g. `history={createMemoryHistory()}` caused
`history.get is not a function`, breaking the whole router example under the IR
codegen. The createComponent call already sits in a createMemo, so reading a
signal in a prop still re-evaluates on change. Both codegens now pass the full
router example and a new differential fixture.
