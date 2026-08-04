import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import init from './index.js';
import { AUTO_IMPORTED } from './auto-import.js';

/**
 * The map duplicates the compiler's sets (the plugin is a bundle; importing the
 * compiler would dwarf it). These tests read the compiler source and pin the two
 * to each other, so adding a component there without updating here fails.
 */
const PLUGIN_SOURCE = resolve(
  import.meta.dirname ?? __dirname,
  '../../compiler/src/frontend/babel/plugin.ts',
);

function setLiteral(name: string): string[] {
  const source = readFileSync(PLUGIN_SOURCE, 'utf8');
  const start = source.indexOf(`const ${name} = new Set([`);
  if (start === -1) throw new Error(`${name} not found — the compiler moved it`);
  const body = source.slice(start, source.indexOf(']', start));
  return [...body.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]!);
}

describe('the auto-import map matches the compiler', () => {
  it('covers every control-flow component the compiler injects', () => {
    for (const name of setLiteral('CONTROL_FLOW_COMPONENTS')) {
      expect(AUTO_IMPORTED[name], `${name} is auto-imported but unmapped`).toBeDefined();
    }
  });

  it('covers every router component the compiler injects', () => {
    for (const name of setLiteral('ROUTER_COMPONENTS')) {
      expect(AUTO_IMPORTED[name], `${name} is auto-imported but unmapped`).toBeDefined();
    }
  });

  it('sends the core-only components to core, not dom', () => {
    // dom does not export these, so resolving them against dom would find nothing.
    for (const name of setLiteral('CORE_ONLY_CONTROL_FLOW')) {
      if (!AUTO_IMPORTED[name]) continue; // not auto-imported at all — see below
      expect(AUTO_IMPORTED[name]).toBe('@fluixi/core');
    }
  });

  it('maps nothing the compiler does not inject', () => {
    const injected = new Set([
      ...setLiteral('CONTROL_FLOW_COMPONENTS'),
      ...setLiteral('ROUTER_COMPONENTS'),
    ]);
    for (const name of Object.keys(AUTO_IMPORTED)) {
      expect(injected.has(name), `${name} is mapped but the compiler never injects it`).toBe(true);
    }
  });
});

const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC = 'declare function html(s: TemplateStringsArray, ...v: any[]): any;\n';

const DOM = '/node_modules/@fluixi/dom/index.d.ts';
const DOM_SRC = 'export declare function Show(props: { when: unknown }): any;\n';
const DOM_PKG = JSON.stringify({
  name: '@fluixi/dom',
  version: '1.0.0',
  exports: { '.': { types: './index.d.ts', default: './index.js' } },
});

function setup(code: string, fileName = '/app.ts') {
  const files: Record<string, string> = {
    [fileName]: code,
    [GLOBALS]: GLOBALS_SRC,
    [DOM]: DOM_SRC,
    '/node_modules/@fluixi/dom/package.json': DOM_PKG,
  };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      if (files[f]) return ts.ScriptSnapshot.fromString(files[f]);
      const d = ts.sys.readFile(f);
      return d !== undefined ? ts.ScriptSnapshot.fromString(d) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.Latest,
      noEmit: true,
      strict: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => f in files || ts.sys.fileExists(f),
    readFile: (f) => (f in files ? files[f] : ts.sys.readFile(f)),
    readDirectory: ts.sys.readDirectory,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const ls = (init as any)({ typescript: ts }).create({
    languageService,
    languageServiceHost: host,
    project: {},
    serverHost: {},
    config: {},
  });
  return { ls, fileName };
}

describe('navigation for an auto-imported component', () => {
  it('goes to the definition of a tag that has no import', () => {
    const code = 'const t = html`<Show when=${1}>x</Show>`;';
    const { ls, fileName } = setup(code);

    const defs = ls.getDefinitionAtPosition(fileName, code.indexOf('<Show') + 1);
    expect(defs).toHaveLength(1);
    expect(defs![0].fileName).toBe(DOM);
    expect(DOM_SRC.slice(defs![0].textSpan.start, defs![0].textSpan.start + defs![0].textSpan.length))
      .toBe('Show');
  });

  it('hovers a tag that has no import', () => {
    const code = 'const t = html`<Show when=${1}>x</Show>`;';
    const { ls, fileName } = setup(code);

    const info = ls.getQuickInfoAtPosition(fileName, code.indexOf('<Show') + 1);
    const text = (info?.displayParts ?? []).map((p: ts.SymbolDisplayPart) => p.text).join('');
    expect(text).toContain('Show');
  });
});

/**
 * The real packages are barrels that re-export, and an auto-imported component
 * means nothing imports the module — so its declarations are NOT in the program.
 * That combination is what actually ships, and it broke every dom-hosted component
 * while `Suspense` kept working, because something else pulled core into the program.
 */
const BARREL: Record<string, string> = {
  '/node_modules/@fluixi/dom/package.json': JSON.stringify({
    name: '@fluixi/dom',
    version: '1.0.0',
    exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
  }),
  '/node_modules/@fluixi/dom/dist/index.d.ts': "export * from './lib/index.js';\n",
  '/node_modules/@fluixi/dom/dist/lib/index.d.ts': "export * from './flow/index.js';\n",
  '/node_modules/@fluixi/dom/dist/lib/flow/index.d.ts':
    'export declare function Show(props: { when: unknown }): any;\n' +
    'export declare function For(props: { each: unknown }): any;\n',
};

function barrelSetup(code: string, fileName = '/app.ts') {
  const files: Record<string, string> = { ...BARREL, [fileName]: code, [GLOBALS]: GLOBALS_SRC };
  const host: ts.LanguageServiceHost = {
    // Deliberately NOT listing the package: nothing imports it, so it is not in
    // the program — exactly the situation an auto-imported tag creates.
    getScriptFileNames: () => [fileName, GLOBALS],
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      if (files[f]) return ts.ScriptSnapshot.fromString(files[f]);
      const d = ts.sys.readFile(f);
      return d !== undefined ? ts.ScriptSnapshot.fromString(d) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.Latest,
      noEmit: true,
      strict: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => f in files || ts.sys.fileExists(f),
    readFile: (f) => (f in files ? files[f] : ts.sys.readFile(f)),
    readDirectory: ts.sys.readDirectory,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const ls = (init as any)({ typescript: ts }).create({
    languageService,
    languageServiceHost: host,
    project: {},
    serverHost: {},
    config: {},
  });
  return { ls, fileName };
}

describe('a module that is not in the program', () => {
  it('still goes to the definition, through the barrel', () => {
    const code = 'const t = html`<Show when=${1}>x</Show>`;';
    const { ls, fileName } = barrelSetup(code);

    const defs = ls.getDefinitionAtPosition(fileName, code.indexOf('<Show') + 1);
    expect(defs).toHaveLength(1);
    expect(defs![0].fileName).toBe('/node_modules/@fluixi/dom/dist/lib/flow/index.d.ts');
    const target = BARREL['/node_modules/@fluixi/dom/dist/lib/flow/index.d.ts']!;
    expect(target.slice(defs![0].textSpan.start, defs![0].textSpan.start + defs![0].textSpan.length))
      .toBe('Show');
  });

  it('works for every auto-imported component, not just one', () => {
    const code = 'const t = html`<For each=${[]}>x</For>`;';
    const { ls, fileName } = barrelSetup(code);
    const defs = ls.getDefinitionAtPosition(fileName, code.indexOf('<For') + 1);
    expect(defs).toHaveLength(1);
  });

  it('says nothing for a tag that is not auto-imported', () => {
    const code = 'const t = html`<Mystery />`;';
    const { ls, fileName } = barrelSetup(code);
    expect(ls.getDefinitionAtPosition(fileName, code.indexOf('<Mystery') + 1) ?? []).toHaveLength(0);
  });
});
