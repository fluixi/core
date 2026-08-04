/**
 * Fluixi TypeScript language-service plugin.
 *
 * Gives html`` templates real TypeScript support. There are two layers:
 *
 *  1. A RELIABLE base (never fails): hovering a callback param shows its inferred
 *     type, the implicit-any noise on inferred params is dropped, a component
 *     used only through a tag isn't reported unused, and component tags hover.
 *  2. A GUARDED enhancement: a VIRTUAL document (each html`` becomes typed helper
 *     calls embedding the ${…} holes) type-checked by a second language service,
 *     adding real completion and deep error-checking inside templates. Every use
 *     of it is wrapped so a failure falls back to layer 1 — it can never break
 *     the editor.
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
import { VirtualService } from './virtual-service.js';
import { mapDiagnostic } from './bridge.js';

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

      // The virtual document is best-effort: if it can't be built in this
      // environment, the plugin still works via the reliable layer below.
      let vs: VirtualService | undefined;
      try {
        vs = new VirtualService(ts, info.languageServiceHost);
      } catch {
        vs = undefined;
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

      // Layer 2 (guarded): deep type errors from the virtual document, only for
      // positions inside a `${…}` hole (so we don't duplicate non-template diags).
      const holeDiagnostics = (fileName: string, get: (f: string) => ts.Diagnostic[]): ts.Diagnostic[] => {
        if (!vs || !vs.segmentsFor(fileName)) return [];
        try {
          const sourceFile = ls.getProgram()?.getSourceFile(fileName);
          const out: ts.Diagnostic[] = [];
          for (const d of get(fileName)) {
            if (d.start === undefined) continue;
            const m = mapDiagnostic(vs, fileName, d);
            if (m && m.start !== undefined && (vs.inHole(fileName, m.start) || vs.inKey(fileName, m.start))) {
              out.push({ ...m, file: sourceFile } as ts.Diagnostic);
            }
          }
          return out;
        } catch {
          return [];
        }
      };

      proxy.getSemanticDiagnostics = (fileName: string) => {
        const base = reliableFilter(fileName, ls.getSemanticDiagnostics(fileName));
        return base.concat(holeDiagnostics(fileName, (f) => vs!.service().getSemanticDiagnostics(f)) as any);
      };
      proxy.getSuggestionDiagnostics = (fileName: string) =>
        reliableFilter(fileName, ls.getSuggestionDiagnostics(fileName));

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
