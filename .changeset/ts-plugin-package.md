---
"@fluixi/ts-plugin": minor
---

New package: a TypeScript language-service plugin. Teaches tsserver that a
component used only inside an html`` template (e.g. `<UserCard/>`) counts as a
reference, so it isn't flagged "declared but never used", and adds hover for
component tags inside templates.
