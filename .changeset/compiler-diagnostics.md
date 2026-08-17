---
"@fluixi/compiler": patch
---

Say when a component reference or a `load:` directive can't work.

Both cases built cleanly and failed at runtime with no trace anywhere else:

- A capitalised tag nothing imports and no `resolve` rule supplies compiles to a
  reference to a name that does not exist, so the component renders nothing.
  Commenting one line out of a `resolve` map was enough.
- A deferring `load:` on a component the compiler doesn't supply is dropped, because
  deferring means creating the binding as a dynamic import and there is nothing to
  create. The chunk then ships eagerly, and nothing says so.

Both warn now, naming the component and which situation it is, since the fixes
differ. Warnings print once per message per module, so a watch rebuild doesn't
repeat them.
