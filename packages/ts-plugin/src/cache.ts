/**
 * Per-file caches for work that would otherwise repeat on every keystroke.
 *
 * Everything is keyed on the `SourceFile` object, which TypeScript replaces
 * whenever the file changes: so a `WeakMap` gives exact invalidation for free,
 * with no version bookkeeping and no way to serve a stale parse.
 *
 * This matters because the editor calls completion/hover/diagnostics several
 * times per keystroke, and each entry point needs the same parsed template.
 */
import type * as TS from 'typescript';
import { parseTemplate, type ParseResult } from '@fluixi/template-parser';
import { templatePieces } from './pieces.js';

const parsed = new WeakMap<TS.SourceFile, Map<number, ParseResult>>();

/** Parse a template, reusing the result for as long as the file is unchanged. */
export function parseCached(
  ts: typeof TS,
  sf: TS.SourceFile,
  tpl: TS.TemplateLiteral,
): ParseResult {
  let byTemplate = parsed.get(sf);
  if (!byTemplate) {
    byTemplate = new Map();
    parsed.set(sf, byTemplate);
  }
  const key = tpl.getStart(sf);
  const hit = byTemplate.get(key);
  if (hit) return hit;

  const result = parseTemplate(templatePieces(ts, tpl, sf));
  byTemplate.set(key, result);
  return result;
}

const templates = new WeakMap<TS.SourceFile, TS.TaggedTemplateExpression[]>();

/**
 * Whether the text could hold a tagged template this plugin cares about. A plain
 * substring test, deliberately: it only has to be right when it says "no".
 * Whitespace between tag and backtick is legal (`html \`…\``) but nobody writes it,
 * and a false "no" costs only the plugin's features, never correctness.
 */
function mayHaveTemplate(text: string): boolean {
  return text.includes('html`') || text.includes('svg`');
}

const NONE: TS.TaggedTemplateExpression[] = [];

/**
 * Every `html`/`svg` template in the file, collected in one AST walk instead of
 * one walk per lookup. Sorted by start so a position lookup is a binary search.
 *
 * A file that cannot contain a template skips the walk entirely. The plugin is loaded
 * by tsserver in every project, so most files it sees have no `` html`` `` at all, and
 * scanning the text for the tag is far cheaper than traversing the AST to prove it.
 */
export function templatesIn(ts: typeof TS, sf: TS.SourceFile): TS.TaggedTemplateExpression[] {
  const hit = templates.get(sf);
  if (hit) return hit;

  if (!mayHaveTemplate(sf.text)) {
    templates.set(sf, NONE);
    return NONE;
  }

  const found: TS.TaggedTemplateExpression[] = [];
  const visit = (node: TS.Node): void => {
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      (node.tag.text === 'html' || node.tag.text === 'svg')
    ) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  found.sort((a, b) => a.getStart(sf) - b.getStart(sf));
  templates.set(sf, found);
  return found;
}

/**
 * The innermost template containing `pos`. Templates nest (a template can appear
 * inside a `${…}` hole), so the last match wins.
 */
export function templateAtCached(
  ts: typeof TS,
  sf: TS.SourceFile,
  pos: number,
): TS.TaggedTemplateExpression | undefined {
  let match: TS.TaggedTemplateExpression | undefined;
  for (const tpl of templatesIn(ts, sf)) {
    const start = tpl.template.getStart(sf);
    if (start > pos) break; // sorted: nothing later can contain pos
    if (pos <= tpl.template.getEnd()) match = tpl;
  }
  return match;
}
