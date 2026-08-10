---
"@fluixi/compiler": patch
---

The native path is checked against the babel one over 681 real files.

`store-admin` and `storefront`, the whole `@fluixi-ui` component library, its
playground, and this repo's docs, web, examples and playground: 281 files
containing JSX or templates compiled both ways and compared on what the output
does — element and template calls, inserts, spreads, component calls, and the
attribute names that reach the DOM. No failures, no differences.

The docs site builds natively and its 53 prerendered pages are byte-identical to
the babel build once the bundle hash is normalised.

One open difference: the native output tree-shakes slightly less. On the
`@fluixi-ui` playground the bundle is 487.8 kB against 477.1 kB, with the same
225 modules in both — nothing is missing, some unused components are retained
that the babel output lets rollup drop. Not diagnosed yet.
