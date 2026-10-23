/**
 * Hover for component tags inside `` html`` `` templates.
 *
 * TypeScript sees `<AsyncName ...>` as text in a string, so hovering the tag shows
 * nothing. We map the tag to the binding it names, then return the SAME quick
 * info TypeScript would show for that binding (its signature/type), remapped so
 * the hover highlights the tag in the template. Same idea as ts-lit-plugin.
 */
import type * as TS from 'typescript';
import { parseTemplate, type ComponentNode, type TemplateNode } from '@fluixi/template-parser';
import { parseCached, templateAtCached as templateAt } from './cache.js';
import { autoImportedSymbol } from './auto-import.js';

export function componentQuickInfo(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.QuickInfo | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;

  const template = templateAt(ts, sf, position);
  if (!template) return undefined;

  const hit = componentTagAt(template, sf, position, ts);
  if (!hit) return undefined;

  // Resolve the tag's root name to a binding visible at the template.
  const checker = program.getTypeChecker();
  const flags = ts.SymbolFlags.Value | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Alias;
  // `<Show>`/`<Portal>`/`<Outlet>` have no binding, the compiler injects their
  // import: so fall back to resolving them the way it would. Without this, hover
  // is silent on precisely the components used most.
  const symbol =
    checker.getSymbolsInScope(template, flags).find((s) => s.name === hit.name) ??
    autoImportedSymbol(ts, program, host, sf, hit.name);
  const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (!decl) return undefined;

  // The declaration may live in another file: an auto-imported `<Show>` resolves
  // into @fluixi/dom. Query the file it's actually in, not the one being edited.
  const declFile = decl.getSourceFile();
  const namePos = (decl as { name?: TS.Node }).name?.getStart(declFile) ?? decl.getStart(declFile);
  const info = ls.getQuickInfoAtPosition(declFile.fileName, namePos);
  if (!info) return undefined;

  // Point the hover at the tag in the template, not the declaration.
  return { ...info, textSpan: { start: hit.start, length: hit.name.length } };
}

/** The static component tag name under `position`, with its source span. */
function componentTagAt(
  template: TS.TaggedTemplateExpression,
  sf: TS.SourceFile,
  position: number,
  ts: typeof TS,
): { name: string; start: number } | undefined {
  const { root } = parseCached(ts, sf, template.template);
  let hit: { name: string; start: number } | undefined;

  const walk = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Component' && node.tag) {
        // The tag name sits right after `<` (or `</`). Match either occurrence.
        const openStart = node.loc.start + 1;
        if (within(position, openStart, node.tag.length)) {
          hit = { name: node.tag.split('.')[0], start: openStart };
        }
      }
      if (!hit && 'children' in node && node.children) walk(node.children);
      if (hit) return;
    }
  };
  walk(root.children);
  return hit;
}

function within(pos: number, start: number, length: number): boolean {
  return pos >= start && pos <= start + length;
}
