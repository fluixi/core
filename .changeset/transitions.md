---
"@fluixi/reactive": patch
---

`startTransition` and `useTransition` now keep the current resource value during a transition, showing no Suspense fallback while `isPending` is true and returning a promise that resolves when the loads finish; the initial load still suspends.
