---
"@fluixi/realtime": minor
---

`postgresBus.listen` now accepts a function that creates a client, automatically reconnects with exponential back-off and reports `onGap` when listening resumes, and the channel server sends a resync to every member on a gap and a server connection's `drained()` settles once its unsent bytes fall to a bound.
