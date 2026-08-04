/**
 * Go To Definition, Find References and Rename for component tags in templates.
 *
 * A `${…}` hole is a real expression, so TypeScript already answers all three for
 * it — the plugin just has to stop shadowing those methods. The synthetic part is
 * the tag name: `<UserCard>` is text inside a string literal, invisible to the
 * checker.
 *
 * So the whole job is mapping a tag name to the binding it names, and back. That
 * makes rename CORRECT rather than convenient: renaming a component today leaves
 * every template silently broken, because nothing rewrites the tags.
 *
 * Both the opening and closing tag are collected. Rewriting only `<Tag>` and
 * leaving `</Tag>` would produce a mismatched template — worse than not renaming.
 */
import type * as TS from 'typescript';
import type { ComponentNode, TemplateNode } from '@fluixi/template-parser';
import { parseCached, templateAtCached, templatesIn } from './cache.js';
import { autoImportedSymbol, declarationSite } from './auto-import.js';

/** A tag-name occurrence in a template: where it is, and what it names. */
export interface TagSpan {
  /** Root name — `Ctx.Provider` is keyed by `Ctx`, which is the binding. */
  name: string;
  /** Offset of the root name itself. */
  start: number;
  length: number;
}

const spansByFile = new WeakMap<TS.SourceFile, TagSpan[]>();

/**
 * Every component-tag occurrence in a file, opening and closing. Cached on the
 * SourceFile, which TypeScript replaces on edit, so it invalidates itself.
 */
export function tagSpans(ts: typeof TS, sf: TS.SourceFile): TagSpan[] {
  const hit = spansByFile.get(sf);
  if (hit) return hit;

  const out: TagSpan[] = [];
  for (const template of templatesIn(ts, sf)) {
    const { root } = parseCached(ts, sf, template.template);

    const walk = (nodes: readonly TemplateNode[]): void => {
      for (const node of nodes) {
        if (node.kind === 'Component' && node.tag) {
          const component = node as ComponentNode;
          const name = component.tag.split('.')[0]!;
          // Opening tag: the name sits immediately after `<`.
          out.push({ name, start: component.loc.start + 1, length: name.length });

          // Closing tag, when the element isn't self-closing. Found by scanning
          // back from the node's end rather than trusting a fixed offset, since
          // `</Tag >` and `</ Tag>` are both legal.
          const closing = closingTagName(sf.text, component.loc.end, component.tag);
          if (closing !== undefined) out.push({ name, start: closing, length: name.length });
        }
        if ('children' in node && node.children) walk(node.children as readonly TemplateNode[]);
      }
    };
    walk(root.children);
  }

  spansByFile.set(sf, out);
  return out;
}

/** Offset of the root name inside the closing tag ending at `end`, if there is one. */
function closingTagName(text: string, end: number, tag: string): number | undefined {
  const open = text.lastIndexOf('</', end);
  if (open === -1) return undefined;
  const close = text.indexOf('>', open);
  if (close === -1 || close >= end) return undefined;
  const index = text.indexOf(tag, open);
  return index !== -1 && index < close ? index : undefined;
}

/** The tag occurrence under `position`, if the position is on one. */
export function tagAt(ts: typeof TS, sf: TS.SourceFile, position: number): TagSpan | undefined {
  if (!templateAtCached(ts, sf, position)) return undefined;
  return tagSpans(ts, sf).find((s) => position >= s.start && position <= s.start + s.length);
}

/** Resolve a name visible at `location` to its declaration symbol, following aliases. */
function symbolFor(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  location: TS.Node,
  name: string,
): TS.Symbol | undefined {
  const checker = program.getTypeChecker();
  const flags =
    ts.SymbolFlags.Value | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Alias;
  const symbol = checker.getSymbolsInScope(location, flags).find((s) => s.name === name);

  // No binding in scope is the normal case for `<Show>`/`<Portal>`/`<Outlet>` —
  // the compiler injects their import, so resolve them the way it would.
  if (!symbol) return autoImportedSymbol(ts, program, host, location.getSourceFile(), name);

  // An import is an alias; compare the thing it points at so usages in different
  // files, each with their own import, resolve to one symbol.
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

/** The declaration a tag names, for jumping to it. */
function declarationFor(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  sf: TS.SourceFile,
  tag: TagSpan,
): TS.Declaration | undefined {
  const template = templateAtCached(ts, sf, tag.start);
  if (!template) return undefined;
  const symbol = symbolFor(ts, program, host, template, tag.name);
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
}

/** Go To Definition from a component tag. */
export function templateDefinition(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.DefinitionInfo[] | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;

  const tag = tagAt(ts, sf, position);
  if (!tag) return undefined;

  const decl = declarationFor(ts, program, host, sf, tag);
  if (!decl) {
    // An auto-imported component usually isn't in the program at all — nothing
    // imports its module, which is the whole point. Definition needs only a file
    // and a span, so read it from disk.
    const site = declarationSite(ts, program, host, sf, tag.name);
    if (!site) return undefined;
    return [
      {
        fileName: site.fileName,
        textSpan: { start: site.start, length: site.length },
        kind: ts.ScriptElementKind.unknown,
        name: tag.name,
        containerKind: ts.ScriptElementKind.unknown,
        containerName: '',
      },
    ];
  }

  const target = (decl as { name?: TS.Node }).name ?? decl;
  const declFile = decl.getSourceFile();
  return [
    {
      fileName: declFile.fileName,
      textSpan: { start: target.getStart(declFile), length: target.getWidth(declFile) },
      kind: ts.ScriptElementKind.unknown,
      name: tag.name,
      containerKind: ts.ScriptElementKind.unknown,
      containerName: '',
    },
  ];
}

/**
 * Every template tag across the program that resolves to the same symbol.
 *
 * Files are pre-filtered on the literal `html\`` before anything is parsed, so a
 * project without templates costs one string search per file.
 */
export function tagOccurrences(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  symbol: TS.Symbol,
  name: string,
): Array<{ fileName: string; span: TS.TextSpan }> {
  const out: Array<{ fileName: string; span: TS.TextSpan }> = [];

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;
    const text = sf.text;
    if (text.indexOf('html`') === -1 && text.indexOf('svg`') === -1) continue;
    if (text.indexOf(name) === -1) continue;

    for (const span of tagSpans(ts, sf)) {
      if (span.name !== name) continue;
      const template = templateAtCached(ts, sf, span.start);
      // Same name is not the same thing — check it resolves to the same symbol,
      // so an unrelated local `Button` in another file isn't swept in.
      if (!template || symbolFor(ts, program, host, template, name) !== symbol) continue;
      out.push({ fileName: sf.fileName, span: { start: span.start, length: span.length } });
    }
  }
  return out;
}

/** The symbol a request at `position` is about — via a tag, or the real checker. */
function symbolAt(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  sf: TS.SourceFile,
  position: number,
): { symbol: TS.Symbol; name: string } | undefined {
  const checker = program.getTypeChecker();

  const tag = tagAt(ts, sf, position);
  if (tag) {
    const template = templateAtCached(ts, sf, tag.start);
    const symbol = template && symbolFor(ts, program, host, template, tag.name);
    return symbol ? { symbol, name: tag.name } : undefined;
  }

  // Not in a template — the cursor may be on the declaration itself, in which
  // case template usages still belong in the result.
  const token = tokenAt(ts, sf, position);
  if (!token || !ts.isIdentifier(token)) return undefined;
  let symbol = checker.getSymbolAtLocation(token);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol ? { symbol, name: token.text } : undefined;
}

function tokenAt(ts: typeof TS, sf: TS.SourceFile, position: number): TS.Node | undefined {
  let found: TS.Node | undefined;
  const visit = (node: TS.Node): void => {
    if (position < node.getStart(sf) || position > node.getEnd()) return;
    if (node.getChildCount(sf) === 0) found = node;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Template tag references to merge into the real reference list. */
export function templateReferences(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.ReferenceEntry[] {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return [];

  const hit = symbolAt(ts, program, host, sf, position);
  if (!hit) return [];

  return tagOccurrences(ts, program, host, hit.symbol, hit.name).map(({ fileName: f, span }) => ({
    fileName: f,
    textSpan: span,
    isWriteAccess: false,
    isDefinition: false,
  }));
}

/** Template tag locations to merge into a rename, so `</Tag>` is rewritten too. */
export function templateRenameLocations(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.RenameLocation[] {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return [];

  const hit = symbolAt(ts, program, host, sf, position);
  if (!hit) return [];

  return tagOccurrences(ts, program, host, hit.symbol, hit.name).map(({ fileName: f, span }) => ({
    fileName: f,
    textSpan: span,
  }));
}
