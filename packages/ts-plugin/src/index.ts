/**
 * Fluixi TypeScript language-service plugin.
 *
 * Gives html`` templates real TypeScript support. There are two layers:
 *
 *  1. A RELIABLE base (never fails): hovering a callback param shows its inferred
 *     type, the implicit-any noise on inferred params is dropped, a component
 *     used only through a tag isn't reported unused, and component tags hover.
 *  2. A GUARDED enhancement: a SHADOW file per template-bearing file (each html``
 *     becomes typed helper calls embedding the ${…} holes), added to the SAME
 *     program, giving deep error-checking inside templates. Every use of it is
 *     wrapped so a failure falls back to layer 1 — it can never break the editor.
 *
 * There is one program and one language service. Shadow files never reach the
 * editor: they're filtered out of references, rename, definitions and highlights,
 * and report no diagnostics of their own.
 *
 * Enable it in a project's tsconfig (using the workspace TypeScript version):
 *   { "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
 */
import type * as ts from 'typescript';
import { shouldSuppress, usedComponentTags } from './collect.js';
import { componentQuickInfo } from './hover.js';
import { paramQuickInfo, inferParamAt } from './infer.js';
import { componentPropCompletions, componentPropHover } from './props.js';
import { paramMemberCompletions } from './completion.js';
import { elementAttributeCompletions, elementAttributeHover } from './elements.js';
import { ShadowFiles, isShadowPath } from './shadow.js';

interface PluginCreateInfo {
  languageService: ts.LanguageService;
  languageServiceHost: ts.LanguageServiceHost;
}
interface PluginModule {
  create(info: PluginCreateInfo): ts.LanguageService;
}

/** tsserver calls this with the TS module instance the editor is running. */
function init(modules: { typescript: typeof ts }): PluginModule {
  const ts = modules.typescript;
  return {
    create(info: PluginCreateInfo): ts.LanguageService {
      const ls = info.languageService;
      // The host doubles as a module-resolution host, which element support needs
      // to locate @fluixi/dom/attributes from the file being edited.
      const host = info.languageServiceHost as unknown as ts.ModuleResolutionHost;

      // Deep template checking runs on the SAME program via shadow files; if it
      // can't be set up here, the reliable layer below still works.
      let shadows: ShadowFiles | undefined;
      try {
        shadows = new ShadowFiles(ts, info.languageServiceHost);
      } catch {
        shadows = undefined;
      }

      const proxy: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(ls) as Array<keyof ts.LanguageService>) {
        const member = ls[key];
        proxy[key] = typeof member === 'function' ? (member as Function).bind(ls) : member;
      }

      // Wrap our entries as a completion list. isNewIdentifierLocation:true makes
      // the editor SHOW them even with an empty prefix (otherwise a fresh trigger
      // sometimes hides them until a character is typed).
      const completionList = (entries: ts.CompletionEntry[]): ts.CompletionInfo => ({
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: true,
        entries,
      });

      const IMPLICIT_ANY = new Set([7006, 7044]);

      // Layer 1 (reliable): drop unused-component reports and implicit-any noise
      // on params we can infer from the template.
      const reliableFilter = <T extends ts.Diagnostic>(fileName: string, diagnostics: T[]): T[] => {
        const program = ls.getProgram();
        const sourceFile = program?.getSourceFile(fileName);
        if (!program || !sourceFile) return diagnostics;
        const used = usedComponentTags(ts, sourceFile);
        return diagnostics.filter((d) => {
          if (used.size > 0 && shouldSuppress(ts, sourceFile, d, used)) return false;
          if (IMPLICIT_ANY.has(d.code) && d.start !== undefined && inferParamAt(ts, program, sourceFile, d.start)) return false;
          return true;
        });
      };

      // Layer 2 (guarded): deep type errors from the shadow file, kept to positions
      // inside a `${…}` hole so nothing outside the template is reported twice.
      const holeDiagnostics = (fileName: string): ts.Diagnostic[] => {
        const shadow = shadows?.shadowFor(fileName);
        if (!shadow) return [];
        try {
          const sourceFile = ls.getProgram()?.getSourceFile(fileName);
          const out: ts.Diagnostic[] = [];
          for (const d of ls.getSemanticDiagnostics(shadow)) {
            if (d.start === undefined) continue;
            const start = shadows!.toSrc(fileName, d.start);
            if (start === -1) continue; // generated scaffolding, not the user's code
            if (!shadows!.inHole(fileName, start) && !shadows!.inKey(fileName, start)) continue;
            out.push({ ...d, start, file: sourceFile } as ts.Diagnostic);
          }
          return out;
        } catch {
          return [];
        }
      };

      proxy.getSemanticDiagnostics = (fileName: string) => {
        if (isShadowPath(fileName)) return [];
        const base = reliableFilter(fileName, ls.getSemanticDiagnostics(fileName));
        return base.concat(holeDiagnostics(fileName) as any);
      };
      proxy.getSuggestionDiagnostics = (fileName: string) =>
        isShadowPath(fileName) ? [] : reliableFilter(fileName, ls.getSuggestionDiagnostics(fileName));
      proxy.getSyntacticDiagnostics = (fileName: string) =>
        isShadowPath(fileName) ? [] : ls.getSyntacticDiagnostics(fileName);

      // Shadow files are an implementation detail of template checking. They are
      // in the program, so a whole-program search can reach them — and an edit
      // returned against a path the editor doesn't have would be applied blind.
      // Drop them from every result the editor might act on.
      const notShadow = <T extends { fileName: string }>(items: readonly T[] | undefined) =>
        items?.filter((i) => !isShadowPath(i.fileName));

      proxy.findRenameLocations = (
        fileName: string, position: number, findInStrings: boolean,
        findInComments: boolean, prefs?: unknown,
      ) => notShadow(ls.findRenameLocations(fileName, position, findInStrings, findInComments, prefs as never));

      proxy.getReferencesAtPosition = (fileName: string, position: number) =>
        notShadow(ls.getReferencesAtPosition(fileName, position));

      proxy.getDefinitionAtPosition = (fileName: string, position: number) =>
        notShadow(ls.getDefinitionAtPosition(fileName, position));

      proxy.getImplementationAtPosition = (fileName: string, position: number) =>
        notShadow(ls.getImplementationAtPosition(fileName, position));

      proxy.getDocumentHighlights = (fileName: string, position: number, filesToSearch: string[]) =>
        ls.getDocumentHighlights(fileName, position, filesToSearch)
          ?.filter((h) => !isShadowPath(h.fileName));

      proxy.findReferences = (fileName: string, position: number) =>
        ls.findReferences(fileName, position)
          ?.filter((r) => !isShadowPath(r.definition.fileName))
          .map((r) => ({ ...r, references: r.references.filter((x) => !isShadowPath(x.fileName)) }));

      // Hover (all computed on the main checker, so it always works): a component
      // prop name; else an inferred callback param (each/event/ref/use/Show/…);
      // else the real hover / component-tag hover.
      proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
        try {
          const prop = componentPropHover(ts, ls, fileName, position);
          if (prop) return prop;
        } catch { /* fall through */ }
        try {
          const attr = elementAttributeHover(ts, ls, host, fileName, position);
          if (attr) return attr;
        } catch { /* fall through */ }
        try {
          const inferred = paramQuickInfo(ts, ls, fileName, position);
          if (inferred) return inferred;
        } catch { /* fall through */ }
        return ls.getQuickInfoAtPosition(fileName, position) ?? componentQuickInfo(ts, ls, fileName, position);
      };

      // Completion (main checker): component prop names in a tag's attribute area;
      // else members of an inferred callback param (`it.` / `el.` / `e.`); else real.
      proxy.getCompletionsAtPosition = (fileName: string, position: number, options: unknown, formatting?: unknown) => {
        try {
          const props = componentPropCompletions(ts, ls, fileName, position);
          if (props) return completionList(props);
        } catch { /* fall through */ }
        try {
          const attrs = elementAttributeCompletions(ts, ls, host, fileName, position);
          if (attrs) return completionList(attrs);
        } catch { /* fall through */ }
        try {
          const members = paramMemberCompletions(ts, ls, fileName, position);
          if (members) return completionList(members);
        } catch { /* fall through */ }
        return ls.getCompletionsAtPosition(fileName, position, options as any, formatting as any);
      };

      return proxy as unknown as ts.LanguageService;
    },
  };
}

export = init;
