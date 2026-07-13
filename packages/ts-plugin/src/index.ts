/**
 * Fluixi TypeScript language-service plugin.
 *
 * Gives html`` templates real TypeScript support. Each source file is mirrored
 * to a VIRTUAL document where every `` html`...` `` becomes typed helper calls
 * that embed the `${…}` holes verbatim (see ./virtual). A second language
 * service runs over the virtual text, so the JS you write inside templates gets
 * full inference, completion, hover, and error-checking — then results are
 * mapped back to the real source. On top of that, a component used only through
 * a template tag (`<UserCard/>`) isn't reported "declared but never used".
 *
 * Enable it in a project's tsconfig (using the workspace TypeScript version):
 *   { "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
 */
import type * as ts from 'typescript';
import { shouldSuppress, usedComponentTags } from './collect.js';
import { componentQuickInfo } from './hover.js';
import { VirtualService } from './virtual-service.js';
import { mapCompletions, mapDiagnostic, mapQuickInfo } from './bridge.js';

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
      const vs = new VirtualService(ts, info.languageServiceHost);
      const vls = vs.service();

      const proxy: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(ls) as Array<keyof ts.LanguageService>) {
        const member = ls[key];
        proxy[key] = typeof member === 'function' ? (member as Function).bind(ls) : member;
      }

      /** True when the file has html`` templates (so the virtual doc applies). */
      const hasVirtual = (fileName: string): boolean => vs.segmentsFor(fileName) !== undefined;

      /** Suppress "unused" reports for components used only through a template tag. */
      const suppressUnused = (fileName: string, diagnostics: ts.Diagnostic[]): ts.Diagnostic[] => {
        const sourceFile = ls.getProgram()?.getSourceFile(fileName);
        if (!sourceFile) return diagnostics;
        const used = usedComponentTags(ts, sourceFile);
        if (used.size === 0) return diagnostics;
        return diagnostics.filter((d) => !shouldSuppress(ts, sourceFile, d, used));
      };

      const diagnostics = (
        fileName: string,
        real: (f: string) => ts.Diagnostic[],
        virtual: (f: string) => ts.Diagnostic[],
      ): ts.Diagnostic[] => {
        if (!hasVirtual(fileName)) return suppressUnused(fileName, real(fileName));
        // The virtual document type-checks the template holes; map its diagnostics
        // back to source (dropping any that land in generated scaffolding).
        const mapped: ts.Diagnostic[] = [];
        for (const d of virtual(fileName)) {
          const m = mapDiagnostic(vs, fileName, d);
          if (m) mapped.push({ ...m, file: ls.getProgram()?.getSourceFile(fileName) });
        }
        return suppressUnused(fileName, mapped);
      };

      proxy.getSemanticDiagnostics = (fileName: string) =>
        diagnostics(fileName, (f) => ls.getSemanticDiagnostics(f), (f) => vls.getSemanticDiagnostics(f));
      proxy.getSuggestionDiagnostics = (fileName: string) =>
        diagnostics(fileName, (f) => ls.getSuggestionDiagnostics(f), (f) => vls.getSuggestionDiagnostics(f)) as ts.DiagnosticWithLocation[];

      // Hover: inside a template hole → the virtual doc's (fully typed) hover;
      // otherwise the real hover, falling back to component-tag hover.
      proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
        if (hasVirtual(fileName)) {
          const gen = vs.toGen(fileName, position);
          if (gen !== -1) {
            const info = mapQuickInfo(vs, fileName, vls.getQuickInfoAtPosition(fileName, gen));
            if (info) return info;
          }
        }
        return ls.getQuickInfoAtPosition(fileName, position) ?? componentQuickInfo(ts, ls, fileName, position);
      };

      // Completion inside a template hole → the virtual doc's completions.
      proxy.getCompletionsAtPosition = (fileName: string, position: number, options: unknown, formatting?: unknown) => {
        if (hasVirtual(fileName)) {
          const gen = vs.toGen(fileName, position);
          if (gen !== -1) {
            const list = mapCompletions(vs, fileName, vls.getCompletionsAtPosition(fileName, gen, options as any, formatting as any));
            if (list) return list;
          }
        }
        return ls.getCompletionsAtPosition(fileName, position, options as any, formatting as any);
      };

      proxy.getCompletionEntryDetails = (
        fileName: string,
        position: number,
        entryName: string,
        formatOptions: unknown,
        source: unknown,
        preferences: unknown,
        data: unknown,
      ) => {
        if (hasVirtual(fileName)) {
          const gen = vs.toGen(fileName, position);
          if (gen !== -1) {
            const d = vls.getCompletionEntryDetails(fileName, gen, entryName, formatOptions as any, source as any, preferences as any, data as any);
            if (d) return d;
          }
        }
        return ls.getCompletionEntryDetails(fileName, position, entryName, formatOptions as any, source as any, preferences as any, data as any);
      };

      return proxy as unknown as ts.LanguageService;
    },
  };
}

export = init;
