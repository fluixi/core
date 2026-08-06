/**
 * Build position-carrying parser pieces from a TS template literal, so the
 * Template AST's spans map back to real offsets in the source file (needed for
 * hover/definition, which must point at the exact tag in the template).
 *
 * The text comes from the source, **not** from `node.text`. `node.text` is the *cooked*
 * value, where an escape like `` \` `` is one character while the source spends two — so
 * every span after an escape is reported short, and hover, completion and diagnostics all
 * land on the wrong offset. A single `` html`\`\`` `` in a file was enough to move a tag's
 * attribute area two characters left, which is exactly the sort of thing that looks like
 * "autocomplete just doesn't work here".
 *
 * Raw text keeps offsets aligned, and the difference is invisible to the parser's job:
 * an escape sequence inside template markup is content, so it changes what a text node
 * contains but never the structure spans are computed from.
 */
import type * as TS from 'typescript';
import type { Piece } from '@fluixi/template-parser';

/**
 * The literal's source text without its delimiters.
 *
 * `getText()` includes them: `` `head${ ``, `` }middle${ ``, `` }tail` ``. Trimming by
 * fixed widths is safe because a template token always carries exactly these.
 */
function rawContent(ts: typeof TS, node: TS.Node, sf: TS.SourceFile): string {
  const text = node.getText(sf);
  const closesWithSubstitution =
    ts.isTemplateHead(node) || ts.isTemplateMiddle(node);
  return text.slice(1, closesWithSubstitution ? -2 : -1);
}

export function templatePieces(ts: typeof TS, tpl: TS.TemplateLiteral, sf: TS.SourceFile): Piece[] {
  if (ts.isNoSubstitutionTemplateLiteral(tpl)) {
    return [{ kind: 'static', text: rawContent(ts, tpl, sf), start: tpl.getStart(sf) + 1 }];
  }
  const pieces: Piece[] = [
    { kind: 'static', text: rawContent(ts, tpl.head, sf), start: tpl.head.getStart(sf) + 1 },
  ];
  tpl.templateSpans.forEach((span, i) => {
    const e = span.expression;
    pieces.push({ kind: 'hole', index: i, start: e.getStart(sf), end: e.getEnd() });
    pieces.push({
      kind: 'static',
      text: rawContent(ts, span.literal, sf),
      start: span.literal.getStart(sf) + 1,
    });
  });
  return pieces;
}
