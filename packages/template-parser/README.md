# @fluixi/template-parser

The parser for Fluixi `` html`...` `` templates: a dependency-free tokenizer +
recursive-descent parser that produces a **located, recoverable Template AST**.

It is the shared foundation for everything that needs to understand a template. Today that
is [`@fluixi/compiler`](../compiler) and [`@fluixi/ts-plugin`](../ts-plugin); the point of
splitting it out is that they agree on one grammar, one node model and one set of
diagnostics, and that a formatter or a language server can join later without a second
grammar appearing.

## Why a separate parser

The compiler used to scan template text straight into codegen IR in one pass.
That was fine for emitting code but useless for tooling: no source spans, no
diagnostics, no error recovery, and hard-wired to Babel. This package is the
parse layer split out so every tool can reuse it:

```
pieces → Reader (lexing + holes) → parseTemplate → Template AST
                                                      │
                    ┌─────────────────────────────────┴──────┐
               compiler (→ IR)                            TS plugin
```

The parser never resolves the JavaScript inside `${...}`. Each hole is recorded as
an **opaque slot** (an index + a source span). Downstream, each tool binds slots
to its own representation: a Babel node in the compiler, a `ts.Expression` in the TS
plugin, raw text in a formatter. That single seam is what keeps the parser host-agnostic.

## Usage

```ts
import { parse } from '@fluixi/template-parser';

const { root, diagnostics } = parse([
  '<button @click=',        // static segment 0
  '>',                      // hole 0 sits between segment 0 and 1
  '</button>',              // static segment 1
]); // → <button @click=${…}>${…}</button>
```

`parse(statics)` takes the static string segments (one more than the number of
holes) and returns `{ root, diagnostics }`. Hosts with real source positions
build `Piece[]` directly (via `parseTemplate`) so every span maps back to the
original file.

## What it parses

Standard HTML, components (`<Button/>`, `<Ctx.Provider>`), fragments (`<>`),
comments, SVG, raw-text elements, void elements, and the full binding surface:

| Syntax | Node |
| --- | --- |
| `name`, `name="x"`, `name=${x}`, `name="a ${x} b"` | `AttributeNode` |
| `?disabled` | `AttributeNode` (boolean) |
| `.currentTime=${t}` | `PropertyBindingNode` |
| `@click=${h}` / `onClick=${h}` | `EventBindingNode` |
| `ref=${el}` | `RefBindingNode` |
| `...${props}` / `${obj}` | `SpreadNode` |
| `if=${c}` / `else` | `IfDirectiveNode` / `ElseDirectiveNode` |
| `each=${xs}` (+ `key`) | `EachDirectiveNode` |
| `bind:value=${sig}` | `BindDirectiveNode` |
| `class:active=${on}` | `ClassDirectiveNode` |
| `style:color=${c}` | `StyleDirectiveNode` |
| `use=${d}` / `use:tooltip` | `UseDirectiveNode` |

## Extensibility

Adding a directive is a new entry in the directive **registry**, never a change
to the core parser:

```ts
import { CORE_DIRECTIVES, parseTemplate, type DirectiveDescriptor } from '@fluixi/template-parser';

const highlight: DirectiveDescriptor = {
  id: 'highlight',
  match: (name) => name === 'highlight',
  build: (raw) => ({ kind: 'Attribute', name: 'data-highlight', value: raw.value, boolean: false, loc: raw.loc }),
};

parseTemplate(pieces, { directives: [highlight, ...CORE_DIRECTIVES] });
```

## Diagnostics

The parser never throws and never stalls. It recovers from malformed input and
reports located diagnostics: unclosed / mismatched / stray tags, unterminated
comments, duplicate directives, and invalid bindings. Every diagnostic carries a
`SourceSpan`.

## License

MIT
