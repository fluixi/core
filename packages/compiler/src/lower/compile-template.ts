/**
 * Compile a `` html`...` `` template to runtime calls, with no JS toolchain in
 * the path.
 *
 *   statics + holes → parseTemplate → IR → resolve → optimize → codegen → code
 *
 * Finding templates in a module and describing each hole still needs a front-end;
 * everything after that point is here. Passes run in the same order as
 * `emitLitViaIR` — compile-template.spec.ts compares the two.
 */
import { analyzeStatic } from '../optimize/analyze-static.js';
import { collapseStrategies } from '../optimize/collapse-strategies.js';
import { imperativeBackend, inlineTemplates } from '../codegen/backends/imperative.js';
import { resolveComponentSources } from '../resolve/resolve-ir.js';
import { createComponentResolver, type ComponentResolverRule } from '../resolve/component-resolver.js';
import type { IRNode } from '../ir/nodes.js';
import { lowerTemplate, type TemplateHole } from './template.js';
import type { Piece } from '@fluixi/template-parser';

export interface TemplateSource {
  /**
   * The static text runs, in order. Always one more than `holes` — the text
   * before the first `${`, between each pair, and after the last `}`.
   */
  statics: readonly string[];
  /** One descriptor per `${…}`, in source order. */
  holes: readonly TemplateHole[];
}

export interface CompileTemplateOptions {
  /** An `` svg`...` `` root, which changes how the parser namespaces tags. */
  svg?: boolean;
  /** Clone static subtrees from a template instead of building them element by element. */
  templateClone?: boolean;
  /** Also clone subtrees whose structure is static but which contain holes. */
  partialTemplates?: boolean;
  /** Rules that resolve an unbound capitalised tag to a module. */
  resolve?: readonly ComponentResolverRule[];
  /** Where control-flow components are imported from. @default '@fluixi/dom' */
  controlFlowModule?: string;
  /** Where core-only components (Suspense, Portal) come from. @default '@fluixi/core' */
  coreModule?: string;
  /** Where router components come from. @default '@fluixi/core/router-next' */
  routerModule?: string;
}

export interface CompileTemplateResult {
  /** A JavaScript expression that builds the DOM when evaluated. */
  code: string;
  /** Runtime symbols the code refers to, for the caller to import. */
  imports: string[];
  /** The IR it was emitted from, for a caller that wants to inspect or transform it. */
  ir: IRNode;
}

/**
 * `statics`/`holes` as the parser wants them. Offsets are cumulative so a
 * diagnostic can point back into the original template text.
 */
function toPieces(source: TemplateSource): Piece[] {
  const pieces: Piece[] = [];
  let offset = 0;
  source.statics.forEach((text, i) => {
    pieces.push({ kind: 'static', text, start: offset });
    offset += text.length;
    if (i < source.holes.length) {
      const end = offset + source.holes[i].code.length;
      pieces.push({ kind: 'hole', index: i, start: offset, end });
      offset = end;
    }
  });
  return pieces;
}

export function compileTemplate(
  source: TemplateSource,
  options: CompileTemplateOptions = {},
): CompileTemplateResult {
  if (source.statics.length !== source.holes.length + 1) {
    throw new Error(
      `[fluixi] compileTemplate: ${source.statics.length} static runs for ` +
        `${source.holes.length} holes — a template always has exactly one more.`,
    );
  }

  const used = new Set<string>();
  const ir = lowerTemplate(toPieces(source), [...source.holes], used, { svg: options.svg });
  analyzeStatic(ir);

  // Same order as the Babel front-end: decide where each component reference
  // comes from, then drop deferred boundaries around modules already in the chunk.
  resolveComponentSources(ir, {
    resolver: createComponentResolver(options.resolve ?? []),
    modules: {
      controlFlowModule: options.controlFlowModule ?? '@fluixi/dom',
      coreModule: options.coreModule ?? '@fluixi/core',
      routerModule: options.routerModule ?? '@fluixi/core/router-next',
    },
    strategyFor: (node) => node.load,
  });
  collapseStrategies(ir);

  const { code, imports, templates } = imperativeBackend.emit(ir, {
    templateClone: options.templateClone,
    partialTemplates: options.partialTemplates,
  } as never);
  for (const symbol of imports) used.add(symbol);

  // Inlined rather than hoisted: there is no module scope to hoist into here.
  // A front-end that has one reads `templates` off the backend and hoists.
  return { code: inlineTemplates(code, templates), imports: [...used], ir };
}
