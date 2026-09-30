---
"@fluixi/start": minor
---

`forward({ to, prefix })` middleware routes requests under a prefix (default `/api`) to another origin, streaming them and preserving all set-cookie headers. It answers 502 when the target is unreachable; WebSocket upgrades are not forwarded.
