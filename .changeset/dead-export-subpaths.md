---
"@fluixi/dom": patch
"@fluixi/reactive": patch
"@fluixi/utils": patch
---

Remove export subpaths that pointed at modules that were never there. `@fluixi/dom/dom`,
`@fluixi/reactive/helpers` and `@fluixi/utils/{array,object,primitive,dom,functions}/types`
all failed to resolve, so nothing could have been importing them.

Also fixes `@fluixi/dom/control-flow` in `publishConfig.exports`, which still pointed at
the old path — the dev export map was corrected but the published one is what npm reads.
