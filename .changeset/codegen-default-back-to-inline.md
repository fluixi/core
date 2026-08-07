---
"@fluixi/compiler": patch
---

Default `codegen` back to `inline`

`1.0.0-alpha.71` made `ir` the default. Running a real component library against it found
two separate defects: `ref` was thunked (fixed in alpha.72), and something further that
breaks delegated interaction in two more packages, still undiagnosed. The IR path is not
at parity with `inline`, so it should not be what an app gets by default.

`codegen: 'ir'` remains available and is still where the newer work lives — template
cloning, partial templates, resolution and load strategies all run through it. It becomes
the default again once a real library passes on it.
