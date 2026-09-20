/**
 * Element attribute support inside html`` templates.
 *
 * Everything here is driven by `IntrinsicElements` from `@fluixi/dom/attributes`
 *: the same tag → attributes map JSX type-checks against, so html`` and JSX
 * agree on what an element accepts, and neither needs the other's package.
 *
 * The editor's HTML language service already offers the standard HTML attribute
 * names from MDN data. What it cannot know is the framework's surface: `classList`,
 * `onClick`, the `Reactive<T>` value types, `prop:`/`attr:`/`bool:`. That comes
 * from the type, which is what this adds.
 *
 * Performance: the resolved type is cached per Program, and the attribute list per
 * tag, so a keystroke costs a map lookup rather than a module resolution.
 */
import type * as TS from 'typescript';
import type { ElementNode, TemplateNode } from '@fluixi/template-parser';
import { parseCached, templateAtCached } from './cache.js';

const ATTRIBUTES_MODULE = '@fluixi/dom/attributes';

interface Intrinsics {
  type: TS.Type | undefined;
  /** Attribute symbols per tag, filled lazily. */
  byTag: Map<string, TS.Symbol[] | undefined>;
}

const perProgram = new WeakMap<TS.Program, Intrinsics>();

/**
 * Resolve `IntrinsicElements` once per Program. A Program is replaced whenever the
 * project changes, so the WeakMap invalidates itself.
 */
function intrinsics(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  sf: TS.SourceFile,
): Intrinsics {
  const hit = perProgram.get(program);
  if (hit) return hit;

  let type: TS.Type | undefined;
  try {
    const checker = program.getTypeChecker();
    const declared = (file: TS.SourceFile | undefined): TS.Type | undefined => {
      if (!file) return undefined;
      const moduleSymbol = checker.getSymbolAtLocation(file);
      const symbol = moduleSymbol?.exports?.get(ts.escapeLeadingUnderscores('IntrinsicElements'));
      return symbol ? checker.getDeclaredTypeOfSymbol(symbol) : undefined;
    };

    const resolved = ts.resolveModuleName(
      ATTRIBUTES_MODULE,
      sf.fileName,
      program.getCompilerOptions(),
      host,
    );
    type = declared(
      resolved.resolvedModule && program.getSourceFile(resolved.resolvedModule.resolvedFileName),
    );

    // Resolution can come up empty: a non-standard layout, or a host that
    // doesn't probe the filesystem. The declarations are still in the program if
    // anything imported dom, so fall back to finding them there.
    if (!type) {
      for (const file of program.getSourceFiles()) {
        if (file.fileName.indexOf('@fluixi/dom') === -1) continue;
        type = declared(file);
        if (type) break;
      }
    }
  } catch {
    type = undefined;
  }

  const entry: Intrinsics = { type, byTag: new Map() };
  perProgram.set(program, entry);
  return entry;
}

/** The attribute symbols a tag accepts, or undefined when the tag isn't known. */
function attributesFor(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  sf: TS.SourceFile,
  tag: string,
): TS.Symbol[] | undefined {
  const state = intrinsics(ts, program, host, sf);
  if (!state.type) return undefined;
  if (state.byTag.has(tag)) return state.byTag.get(tag);

  let props: TS.Symbol[] | undefined;
  const checker = program.getTypeChecker();
  const tagSymbol = state.type.getProperty(tag);
  if (tagSymbol) {
    const decl = tagSymbol.valueDeclaration ?? tagSymbol.declarations?.[0];
    if (decl) props = checker.getTypeOfSymbolAtLocation(tagSymbol, decl).getProperties();
  }
  state.byTag.set(tag, props);
  return props;
}

interface ElementHit {
  tag: string;
  present: Set<string>;
}

/** The element whose attribute area holds `position`, if any. */
function elementAtAttributeArea(
  ts: typeof TS,
  sf: TS.SourceFile,
  tpl: TS.TemplateLiteral,
  position: number,
): ElementHit | undefined {
  const { root } = parseCached(ts, sf, tpl);
  let hit: ElementHit | undefined;

  const walk = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Element') {
        const el = node as ElementNode;
        const openStart = el.loc.start + 1 + el.tag.length;
        const openEnd = firstAttributeEnd(el);
        if (position > openStart && position <= openEnd) {
          const present = new Set<string>();
          for (const a of el.attributes) {
            if ('loc' in a && a.loc) present.add(writtenName(sf.text, a.loc.start));
          }
          hit = { tag: el.tag, present };
        }
      }
      if (!hit && 'children' in node && node.children) walk(node.children as readonly TemplateNode[]);
      if (hit) return;
    }
  };
  walk(root.children);
  return hit;
}

/**
 * The attribute name as WRITTEN in the template. The parser normalises some forms
 * (`onClick` becomes an event binding named `click`, `bind:value` a bind directive),
 * but the type map is keyed by the written name, so read it back from source.
 */
function writtenName(text: string, start: number): string {
  let end = start;
  while (end < text.length && !/[\s=/>]/.test(text[end]!)) end++;
  return text.slice(start, end);
}

/** End of the open tag: the last attribute's end, or the tag itself when bare. */
function firstAttributeEnd(el: ElementNode): number {
  let end = el.loc.start + 1 + el.tag.length;
  for (const a of el.attributes) {
    if ('loc' in a && a.loc) end = Math.max(end, a.loc.end);
  }
  return end + 1;
}

/** Attribute-name completion for a native element inside a template. */
export function elementAttributeCompletions(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.CompletionEntry[] | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;

  const tpl = templateAtCached(ts, sf, position);
  if (!tpl) return undefined;

  const hit = elementAtAttributeArea(ts, sf, tpl.template, position);
  if (!hit) return undefined;

  const props = attributesFor(ts, program, host, sf, hit.tag);
  if (!props) return undefined;

  const entries: TS.CompletionEntry[] = [];
  for (const p of props) {
    const name = p.getName();
    if (name === 'children' || hit.present.has(name)) continue;
    entries.push({
      name,
      kind: ts.ScriptElementKind.memberVariableElement,
      kindModifiers: '',
      sortText: name.startsWith('on') ? '1' : '0',
    });
  }
  return entries.length ? entries : undefined;
}

interface AttributeHit {
  tag: string;
  name: string;
  start: number;
}

function attributeNameAt(
  ts: typeof TS,
  sf: TS.SourceFile,
  tpl: TS.TemplateLiteral,
  position: number,
): AttributeHit | undefined {
  const { root } = parseCached(ts, sf, tpl);
  let hit: AttributeHit | undefined;

  const walk = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Element') {
        const el = node as ElementNode;
        for (const a of el.attributes) {
          if (!('loc' in a) || !a.loc) continue;
          const start = a.loc.start;
          const name = writtenName(sf.text, start);
          if (name && position >= start && position <= start + name.length) {
            hit = { tag: el.tag, name, start };
          }
        }
      }
      if (!hit && 'children' in node && node.children) walk(node.children as readonly TemplateNode[]);
      if (hit) return;
    }
  };
  walk(root.children);
  return hit;
}

/** Hover over an element attribute name: its declared type, from the same map. */
export function elementAttributeHover(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.QuickInfo | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;

  const tpl = templateAtCached(ts, sf, position);
  if (!tpl) return undefined;

  const hit = attributeNameAt(ts, sf, tpl.template, position);
  if (!hit) return undefined;

  const props = attributesFor(ts, program, host, sf, hit.tag);
  const symbol = props?.find((p) => p.getName() === hit.name);
  if (!symbol) return undefined;

  const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!decl) return undefined;
  const checker = program.getTypeChecker();
  const typeText = checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, decl));

  return {
    kind: ts.ScriptElementKind.memberVariableElement,
    kindModifiers: '',
    textSpan: { start: hit.start, length: hit.name.length },
    displayParts: [
      { text: '(', kind: 'punctuation' },
      { text: 'attribute', kind: 'text' },
      { text: ')', kind: 'punctuation' },
      { text: ' ', kind: 'space' },
      { text: `${hit.tag}.`, kind: 'text' },
      { text: hit.name, kind: 'propertyName' },
      { text: ':', kind: 'punctuation' },
      { text: ' ', kind: 'space' },
      { text: typeText, kind: 'text' },
    ],
    documentation: symbol.getDocumentationComment(checker),
  };
}
