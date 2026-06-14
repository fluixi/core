---
"@fluixi/reactive": minor
---

Fix infinite loop when a Suspense boundary resolves during/after disposal. A
disposed computation could still be re-run — `renderToString()` of a `<Suspense>`
whose child kicks off a fetching resource hung the process: disposing the root
cancelled the resource's settle (it stayed loading), but the boundary's
`decrement` (firing as the now-resolved promise settled) kept resuming the
disposed effect, which re-threw the already-resolved promise → synchronous
re-fire. `dispose()` now marks the computation and `updateComputation` skips
disposed nodes, so a disposed computation never re-runs.
