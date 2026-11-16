---
"@fluixi/reactive": patch
"@fluixi/core": patch
---

A route error with a status from 400 to 599 now returns that status on the server (404 shows the built-in not-found view); any other error answers 500, a page whose data fails inside an element now renders the error view on the server instead of an empty element, and the reactive `ErrorBoundary` now provides a `caught()` method that returns the error immediately and untracked.
