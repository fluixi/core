---
"@fluixi/reactive": patch
"@fluixi/core": patch
---

Fix a listener/effect leak when a component is torn down before its `onMount` runs
(e.g. a `<Portal>` inside a `<Show>` that closes in the same tick). The queued mount
callback ran against the already-disposed owner: its `onCleanup` re-created the owner's
nulled cleanups array on a scope that never tears down again, so document listeners
attached in `onMount` stayed live forever.

Owners now carry a `disposed` flag (set by final teardown, not by an effect's between-run
cleanup). The lifecycle flush skips a disposed owner (matching Solid: an unmounted
component's `onMount` doesn't run), and `onCleanup` on a disposed owner runs the teardown
immediately instead of leaking it.
