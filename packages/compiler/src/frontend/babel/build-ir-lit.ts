/**
 * Babel front-end entry for lit `` html`...` `` templates.
 *
 * Historically this file held a single-pass scanner that went straight from
 * template text to compiler IR. That fused parsing, lowering, and Babel
 * concerns into one place with no source spans, no diagnostics, and no reuse
 * outside the compiler. It has been split:
 *
 *   `@fluixi/template-parser`  — Babel-free tokenizer + parser → Template AST
 *   `./lower-template`         — Babel-aware lowering: Template AST → IR
 *
 * `buildIRFromLit` keeps its exact signature so every caller (build-ir's nested
 * composition, plugin's `emitLitViaIR`) is unchanged; the shared Template AST
 * now also powers the language server, TS plugin, and Biome plugin.
 */
import type { types as t } from '@babel/core';
import type { IRNode } from '../../ir/nodes.js';
import { lowerLitTemplate } from './lower-template.js';

/**
 * Build IR from a lit `` html`...` `` (or `` svg`...` ``) TaggedTemplateExpression.
 * `used` collects runtime symbols emitted for anything nested inside a hole.
 * Pass `svg: true` for an `` svg`...` `` root.
 */
export function buildIRFromLit(
  node: t.TaggedTemplateExpression,
  used: Set<string> = new Set(),
  opts: { svg?: boolean } = {},
): IRNode {
  return lowerLitTemplate(node, used, opts);
}
