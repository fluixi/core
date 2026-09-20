/**
 * @fluixi/template-parser: the dependency-free foundation for every tool that
 * needs to understand a Fluixi `` html`...` `` template: the compiler, the
 * language server, the TypeScript plugin, and the Biome/formatter plugin.
 *
 * Pipeline:  pieces → {@link Reader} (lexing/holes) → {@link parseTemplate}
 * (structure + diagnostics) → Template AST. Downstream, each tool binds the
 * opaque hole slots to its own representation and consumes the AST, the
 * compiler lowers it to codegen IR, the LSP answers completion/hover/rename.
 *
 * The parser never resolves the JS inside `${…}`; it records each hole as an
 * index + span. That is the single seam that keeps this package host-agnostic.
 */
export * from './ast.js';
export { Reader, type Piece, type HoleToken } from './reader.js';
export {
  CORE_DIRECTIVES,
  resolveAttribute,
  type DirectiveDescriptor,
  type RawAttribute,
} from './directives.js';
export { parseTemplate, type ParserOptions } from './parser.js';

import type { Piece } from './reader.js';
import { parseTemplate, type ParserOptions } from './parser.js';
import type { ParseResult, SourceSpan } from './ast.js';

/**
 * Build a piece list from the static string segments of a tagged template
 * (`quasi.strings`), inserting a hole between each pair. Offsets are synthetic
 * (cumulative over the joined text), good enough for standalone parsing and
 * tests. Hosts with real source positions (the compiler, the LSP) should build
 * {@link Piece}s directly so spans map back to the original file.
 */
export function piecesFromStrings(statics: readonly string[]): Piece[] {
  const pieces: Piece[] = [];
  let offset = 0;
  statics.forEach((text, i) => {
    pieces.push({ kind: 'static', text, start: offset });
    offset += text.length;
    if (i < statics.length - 1) {
      // zero-width synthetic hole between segments
      pieces.push({ kind: 'hole', index: i, start: offset, end: offset });
    }
  });
  return pieces;
}

/** Convenience: parse directly from static string segments. */
export function parse(
  statics: readonly string[],
  opts: ParserOptions = {},
): ParseResult {
  return parseTemplate(piecesFromStrings(statics), opts);
}

export type { SourceSpan };
