---
"fluixi": patch
---

Fix `Link` and `Form` duplicating element children on hydration.

Both forwarded author attributes with `Object.entries(props)`, which reads every prop
— including `children`, a getter the compiler emits to build fresh nodes per access.
Under hydration that first, discarded build consumed the server's nodes, so the real
read appended a second copy: a doubled logo and pager on every prerendered page, until
a client-side navigation re-rendered the subtree.

They iterate `Object.keys` and read only the props they forward.
