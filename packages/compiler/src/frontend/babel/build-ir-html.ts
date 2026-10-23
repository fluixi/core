/**
 * Babel front-end entry for `` html`...` `` templates.
 *
 * Historically this file held a single-pass scanner that went straight from
 * template text to compiler IR. That fused parsing, lowering, and Babel
 * concerns into one place with no source spans, no diagnostics, and no reuse
 * outside the compiler. It has been split:
 *
 *   `@fluixi/template-parser` : Babel-free tokenizer + parser → Template AST
 *   `./lower-template`        : Babel-aware lowering: Template AST → IR
 *
 * `buildIRFromHtml` keeps its exact signature so every caller (build-ir's nested
 * composition, plugin's `emitHtmlViaIR`) is unchanged; the shared Template AST
 * now also powers the language server, TS plugin, and Biome plugin.
 */
import type { types as t } from '@babel/core';
import type { IRNode } from '../../ir/nodes.js';
import { lowerHtmlTemplate } from './lower-template.js';
import { analyzeStatic } from '../../optimize/analyze-static.js';

/**
 * Build IR from an `` html`...` `` (or `` svg`...` ``) TaggedTemplateExpression.
 * `used` collects runtime symbols emitted for anything nested inside a hole.
 * Pass `svg: true` for an `` svg`...` `` root.
 */
export function buildIRFromHtml(
  node: t.TaggedTemplateExpression,
  used: Set<string> = new Set(),
  opts: { svg?: boolean; onNested?: (ir: IRNode) => void } = {},
): IRNode {
  const ir = lowerHtmlTemplate(node, used, opts);
  // Same pass as the JSX frontend, so both agree on what is inert.
  analyzeStatic(ir);
  return ir;
}
