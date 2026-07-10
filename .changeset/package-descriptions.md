---
"@fluixi/babel-plugin-jsx": patch
"@fluixi/dom": patch
"@fluixi/jsx": patch
"@fluixi/reactive": patch
"@fluixi/router": patch
"@fluixi/server": patch
"@fluixi/utils": patch
---

Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
