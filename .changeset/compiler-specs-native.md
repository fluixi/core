---
"@fluixi/compiler": patch
---

Compiler specs run against the default path.

Every semantic spec — directives, `use:`, `load:`, component resolution, slots,
control flow, template cloning, the imperative fixtures — compiled through the
babel plugin, which is now the optional integration. So the path that ships was
the one without the coverage. They compile through `transformTemplates` now; the
two that stay on babel do so deliberately, and say why: `compile-cost` measures
both, `templates.spec` is the differential between them.

`format` comes back as a transform option. It selected which syntaxes the plugin
touched, and the transform had quietly always compiled both — a dropped option is
worse than a kept one, since a config that sets it would silently mean something
else.
