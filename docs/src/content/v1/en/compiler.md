# The compiler

`fluixi()` compiles by **rewriting your source**. It parses the file once, works out what
each template and each JSX element should become, and splices the result over the spans it
replaces. Nothing reprints the file, so everything you did not write a template in comes out
byte for byte as you wrote it, formatting, comments, and the text inside a `${...}` hole
included. Types are left alone for your bundler to strip.

That is the whole default path. It is not a Babel plugin, and an app installs no Babel
toolchain to use it.

## What an app installs

`@babel/parser`, pulled in by `@fluixi/compiler`. That is the only piece of that namespace on
the default path, the parser, not the plugin system, not the traversal, not the printer.
`@fluixi/vite-plugin` and `@fluixi/start` declare none of it themselves.

Everything downstream of the parse is the framework's own: the IR, the optimizer, the
component resolver, the codegen backend, and `@fluixi/template-parser` for `` html`` ``.

## Using Babel anyway

Some projects have Babel plugins that must see the output, a macro, an instrumentation
pass, a coverage tool wired into a Babel pipeline. Ask for it:

```ts
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [fluixi({ babel: true })],
});
```

That selects the Babel front end instead. Same IR, same passes, same backend, the only
difference is who holds the AST while the work happens. `@babel/core` and the plugin
machinery are optional peer dependencies, installed only when you opt in:

```bash
pnpm add -D @babel/core @fluixi/babel-plugin-jsx
```

You want this when a Babel plugin of yours has to run over the compiled output, or when your
build is a Babel pipeline rather than a bundler (`babel-jest`, `babel src -d lib`). You do
not want it otherwise: it is slower, and it is the path with fewer users.

## Compatibility

- **Both authoring syntaxes compile on either path.** JSX and `` html`` ``/`` svg`` `` are
  the same pipeline behind the same IR, and a template nested inside the other works in
  either direction.
- **The emitted code is identical.** The two front ends were validated against a corpus of
  real application files and compared on what the output *does*, element and template
  calls, inserts, spreads, component calls, and every attribute name that reaches the DOM.
- **Source maps** are emitted on the default path. Code outside a template keeps its exact
  original position. A template resolves to the position of the template itself rather than
  to the individual expression inside it, so a breakpoint in a hole lands on the template
  that produced it.
- **TypeScript is not the compiler's job.** Types are left in place for Vite's own transform
  (Oxc in Vite 8, esbuild before) or your bundler's to strip afterwards, which is why `@babel/preset-typescript` is not
  needed on the default path at all.

## Cost

Measured on a 27 KB file of 100 components (`FLUIXI_BENCH=1` in the repo, so you can rerun
it on your own source):

| | |
| --- | --- |
| parsing | ~3% of a compile |
| the framework's own IR work | ~29% |
| the rest, traversal, reparsing emitted code, printing | ~68% on the Babel path, absent on the default one |

The default path is roughly **13-15× faster** than the Babel one on the same source, and the
reason is structural rather than clever: the Babel path emits code as a string and then
parses that string back into the host's AST, so the same code gets parsed twice.

A first compile costs several times a later one in the same process, JIT warm-up, not
framework state, so a dev server pays more for the first request to a module than for every
edit after it. Directive-heavy templates cost slightly more per template than plain ones and
slightly *less* per kilobyte, so directives are not a thing to avoid for build speed.

Parsing being 3% is also why replacing the parser is not a performance lever. That question
is open on its own terms, not as an optimization.
