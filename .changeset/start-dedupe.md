---
"@fluixi/start": patch
---

The app now loads a single copy of the framework packages, even when a library installs its own, so the app and its libraries share one state.
