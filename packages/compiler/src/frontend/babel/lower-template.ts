/**
 * Babel adapter for `` html`...` `` templates.
 *
 * The lowering itself is in ../../lower/template.ts and takes no Babel. What is
 * left here is the part that genuinely needs to read JavaScript: turning each
 * `${…}` into a `TemplateHole` — its source text, whether it is reactive, and
 * the two structural facts the lowering branches on (a single-expression arrow,
 * an object literal).
 *
 * Nested JSX and nested `` html`` `` inside a hole are compiled here too, by
 * `genExpr`, so the code the lowering receives is already plain JavaScript.
 */
import { types as t } from '@babel/core';
import _generate from '@babel/generator';
import type { Piece } from '@fluixi/template-parser';
import type { IRNode } from '../../ir/nodes.js';
import { lowerTemplate, type TemplateHole } from '../../lower/template.js';
import { genExpr, isReactiveExpr } from './build-ir.js';

const generate: any = (_generate as any).default ?? (_generate as any);
function gen(node: t.Node): string {
  return generate(node as any, { concise: true }).code;
}

/** Describe one `${…}` for the lowering. */
function bindHole(expr: t.Expression, used: Set<string>, events?: Set<string>): TemplateHole {
  const hole: TemplateHole = {
    code: genExpr(expr, used, events),
    reactive: isReactiveExpr(expr),
  };

  // `${item => <li>${item}</li>}` — `each` lowers this into For's render
  // function, which needs the parameters and the body apart from each other. A
  // block body is not a render expression, so it stays an ordinary hole.
  if (t.isArrowFunctionExpression(expr) && !t.isBlockStatement(expr.body)) {
    const body = expr.body as t.Expression;
    hole.arrow = {
      params: expr.params.map((p) => gen(p)),
      body: genExpr(body, used, events),
      bodyReactive: isReactiveExpr(body),
    };
  }

  // `class=${{ active: on() }}` lowers to classList rather than className.
  if (t.isObjectExpression(expr)) hole.object = true;

  return hole;
}

/**
 * Build IR from a lit `` html`...` `` / `` svg`...` `` TaggedTemplateExpression.
 * `used` collects runtime symbols emitted for anything nested inside a hole.
 */
export function lowerLitTemplate(
  node: t.TaggedTemplateExpression,
  used: Set<string>,
  opts: { svg?: boolean; events?: Set<string> } = {},
): IRNode {
  const quasi = node.quasi;
  const holes = quasi.expressions.map((e) => bindHole(e as t.Expression, used, opts.events));
  return lowerTemplate(buildPieces(quasi), holes, used, opts);
}

/** Turn a Babel TemplateLiteral into position-carrying parser pieces. */
function buildPieces(quasi: t.TemplateLiteral): Piece[] {
  const pieces: Piece[] = [];
  quasi.quasis.forEach((q, i) => {
    const text = q.value.cooked ?? q.value.raw;
    pieces.push({ kind: 'static', text, start: q.start ?? 0 });
    if (i < quasi.expressions.length) {
      const e = quasi.expressions[i];
      pieces.push({ kind: 'hole', index: i, start: e.start ?? 0, end: e.end ?? 0 });
    }
  });
  return pieces;
}
