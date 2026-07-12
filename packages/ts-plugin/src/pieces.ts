/**
 * Build position-carrying parser pieces from a TS template literal, so the
 * Template AST's spans map back to real offsets in the source file (needed for
 * hover/definition, which must point at the exact tag in the template).
 */
import type * as TS from 'typescript';
import type { Piece } from '@fluixi/template-parser';

export function templatePieces(ts: typeof TS, tpl: TS.TemplateLiteral, sf: TS.SourceFile): Piece[] {
  if (ts.isNoSubstitutionTemplateLiteral(tpl)) {
    return [{ kind: 'static', text: tpl.text, start: tpl.getStart(sf) + 1 }];
  }
  const pieces: Piece[] = [{ kind: 'static', text: tpl.head.text, start: tpl.head.getStart(sf) + 1 }];
  tpl.templateSpans.forEach((span, i) => {
    const e = span.expression;
    pieces.push({ kind: 'hole', index: i, start: e.getStart(sf), end: e.getEnd() });
    pieces.push({ kind: 'static', text: span.literal.text, start: span.literal.getStart(sf) + 1 });
  });
  return pieces;
}

/** The `html`/`svg` tagged template whose inner text contains `pos`, if any. */
export function templateAt(
  ts: typeof TS,
  sf: TS.SourceFile,
  pos: number,
): TS.TaggedTemplateExpression | undefined {
  let found: TS.TaggedTemplateExpression | undefined;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      (node.tag.text === 'html' || node.tag.text === 'svg') &&
      pos >= node.template.getStart(sf) &&
      pos <= node.template.getEnd()
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}
