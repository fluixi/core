---
"@fluixi/compiler": patch
---

Hoist static templates to module scope on the native path.

`compilePieces` gains `hoistTemplates`, which leaves the `_tmpl$N` references in
place and hands the templates back for a caller with a module scope to declare
them in — matching what the plugin emits. `compileTemplate` still inlines, having
nowhere to hoist to.

Bundle size is unchanged either way (`templateCache` is keyed by the string, not
its identity, so an inlined template still parses once), but the output shape now
matches the path it is replacing.
