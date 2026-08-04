/**
 * Fluixi TypeScript language-service plugin.
 *
 * Gives html`` templates real TypeScript support: hovering a callback param shows
 * its inferred type, element and component attributes complete and hover, a wrong
 * property on an inferred param is reported, the implicit-any noise on those params
 * is dropped, and a component used only through a tag isn't reported unused.
 *
 * Everything is computed on the EXISTING program's checker. The plugin creates no
 * language service, adds no files, and does not touch the host — it only wraps
 * the service it is handed.
 *
 * That restraint is deliberate. Two earlier designs for deep type-checking inside
 * `${…}` holes both had to go: a second `ts.LanguageService` (a second document
 * registry, so lib.d.ts and node_modules were parsed twice), and shadow files
 * added to the program by patching `getScriptFileNames` — which tsserver calls on
 * every project sync, so building shadows there re-entered host machinery and
 * crashed the language service outright. Hole diagnostics are not worth either.
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
import { templateDiagnostics } from './diagnostics.js';

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

      proxy.getSemanticDiagnostics = (fileName: string) => {
        const base = reliableFilter(fileName, ls.getSemanticDiagnostics(fileName));
        try {
          // Additive, and computed on the main checker at real source positions,
          // so a failure here can only cost the extra errors — never the real ones.
          return base.concat(templateDiagnostics(ts, ls, fileName) as never[]);
        } catch {
          return base;
        }
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
