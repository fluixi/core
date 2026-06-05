---
"@fluixi/element": patch
"@fluixi/webui": patch
---

Fix: include `dist` in the published tarball. `@fluixi/element` and `@fluixi/webui` were missing a `files` field, so the gitignored `dist` was excluded and the packages published empty.
