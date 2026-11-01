---
"@fluixi/reactive": patch
---

Disposal now unlinks a computation from the signals it read: `Computed.dispose()` removes it from those signals' observer sets, so a cleared list no longer stays reachable from a signal that outlives it.
