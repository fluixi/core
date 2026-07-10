---
"@fluixi/core": patch
---

Fix `i18n` `t()` key autocomplete for nested messages. A subtree whose children are all strings (e.g. `nav: { dashboard, settings }`) was truncated to the branch key (`'nav'`) instead of recursing to the leaf paths (`'nav.dashboard' | 'nav.settings'`), because it looked structurally identical to a plural map. Plural maps are now detected by their CLDR-category keys (`one`/`other`/…), so real subtrees recurse and every leaf key is suggested and type-checked.
