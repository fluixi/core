---
'@fluixi/dom': patch
'@fluixi/reactive': patch
---

Dispose a control-flow branch when it is left

`Show`, `Switch` and `Dynamic` rendered their branches in the enclosing owner, so
anything a branch registered with `onCleanup` — an event listener, an observer, a
timer — was never torn down when that branch went away. It piled up on the outer
scope and only ran when the whole tree died. In practice: a component inside a
closed `<Show>` kept listening, and reopening left two live listeners, so an
outside-click dismissal fired on clicks *inside* the reopened panel.

Each branch now renders in its own scope, disposed when the branch changes.
Keyed on the branch, not on every re-run: these memos also re-run when a value
changes within the same branch, and disposing then would throw away DOM the
runtime deliberately reuses. `For` already disposed removed items correctly and
is unchanged.

`Match` now holds its `children` lazily, like `when`. Read eagerly, every
branch's children were built the moment the `Match` node was — before `Switch`
had chosen one — so they were created outside the branch's scope, and
non-matching branches were built for nothing.

`@fluixi/reactive` exports `createChildOwner` / `disposeScope` for this: a scope
that is a child of the creation-time owner, so context still resolves up the
chain, but whose cleanups can be torn down independently.
