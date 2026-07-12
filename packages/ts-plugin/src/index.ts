/**
 * Fluixi TypeScript language-service plugin.
 *
 * TypeScript treats a `` html`...` `` template as an opaque string, so a
 * component referenced only by tag — `<UserCard/>` — is never seen as used and
 * gets a "declared but never used" report. This plugin proxies the language
 * service and drops those reports for any binding that IS referenced through a
 * template component tag (detected by reparsing the template with
 * `@fluixi/template-parser`).
 *
 * Enable it in a project's tsconfig (using the workspace TypeScript version):
 *   { "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
 */
import type * as ts from 'typescript';
import { shouldSuppress, usedComponentTags } from './collect.js';
import { componentQuickInfo } from './hover.js';
import { paramQuickInfo, inferParamAt } from './infer.js';

// Minimal shapes from tsserverlibrary — declared locally so the plugin can type
// only against the main `typescript` module (which owns LanguageService).
interface PluginCreateInfo {
  languageService: ts.LanguageService;
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

      const proxy: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(ls) as Array<keyof ts.LanguageService>) {
        const member = ls[key];
        proxy[key] = typeof member === 'function' ? (member as Function).bind(ls) : member;
      }

      // "Parameter implicitly has an 'any' type" (7006) + its suggestion (7044):
      // drop them for a callback param we can infer from the html`` template, so
      // the inferred type isn't reported as an implicit-any error.
      const IMPLICIT_ANY = new Set([7006, 7044]);

      const filter = <T extends ts.Diagnostic>(fileName: string, diagnostics: T[]): T[] => {
        const program = ls.getProgram();
        const sourceFile = program?.getSourceFile(fileName);
        if (!program || !sourceFile) return diagnostics;
        const used = usedComponentTags(ts, sourceFile);
        return diagnostics.filter((d) => {
          if (used.size > 0 && shouldSuppress(ts, sourceFile, d, used)) return false;
          if (IMPLICIT_ANY.has(d.code) && d.start !== undefined && inferParamAt(ts, program, sourceFile, d.start)) {
            return false;
          }
          return true;
        });
      };

      proxy.getSemanticDiagnostics = (fileName: string) => filter(fileName, ls.getSemanticDiagnostics(fileName));
      proxy.getSuggestionDiagnostics = (fileName: string) => filter(fileName, ls.getSuggestionDiagnostics(fileName));

      // Hover inside html``: a callback param (each item / event) gets its
      // inferred type; a `<Component>` tag shows its TS signature.
      proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
        const inferred = paramQuickInfo(ts, ls, fileName, position);
        if (inferred) return inferred;
        return ls.getQuickInfoAtPosition(fileName, position) ?? componentQuickInfo(ts, ls, fileName, position);
      };

      return proxy as unknown as ts.LanguageService;
    },
  };
}

export = init;
