---
"@fluixi/dom": patch
---

Fire non-delegated `onX` event handlers. Handlers for non-bubbling events (`focus`, `blur`, `pointerenter`, `pointerleave`, `mouseenter`, `mouseleave`, `load`, `error`, …) were stored but never attached, so they silently dropped. `addDelegatedEventListener` now attaches a direct listener for those events (removed on cleanup), matching dom-expressions; delegated events (click/keydown/…) are unchanged.
