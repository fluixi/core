/**
 * Component styles in a Vite build: the orchestration around the compiler's style pass.
 *
 * The CSS engine is reached through another plugin's `api.fluixiCss` (@fluixi-css/vite), which
 * owns the project's shared context; the compiler owns ownership and scoping; this file only
 * connects them. Each compiled block becomes a CSS module the component imports, so Vite's own
 * CSS pipeline does the rest: extraction, chunking, dev style tags, hot updates, and the
 * stylesheets @fluixi/start puts in server-rendered pages.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { styleIds, type StyleNode, type StyleOptions, type StyleReference } from './transform/styles.js';

/** What @fluixi-css/vite offers, as far as this file needs. */
interface CssApi {
  styles(from: string): StyleOptions;
  useComponentStyles(): void;
}

interface Compiled {
  code: string;
  styles?: { css: string; map?: unknown; shadow?: boolean }[];
  styleLiterals?: { name: string; css: string }[];
  styleReferences?: StyleReference[];
}

/** Runs the compiler on one module with these style options. */
export type CompileWithStyles = (code: string, id: string, styles: StyleOptions) => Compiled | null;

interface ResolveContext {
  resolve?(source: string, importer: string): Promise<{ id: string } | null | undefined>;
}

interface DevServer {
  moduleGraph: { getModuleById(id: string): unknown };
  reloadModule(mod: never): Promise<void>;
}

// A page stylesheet, or (`?inline`, Vite's own flag) a shadow root's CSS as a string; and a
// css`` value's CSS for a shadow class's `static styles`. The owner is what comes before.
const STYLE_ID = /\.fx-(\d+)\.css(?:\?inline)?$/;
const LITERAL_ID = /\.fx-literal-([\w$]+)\.css\?inline$/;
const SUFFIX = /\.fx-(?:\d+|literal-[\w$]+)\.css(?:\?inline)?$/;

/** The id a component's n-th style block is served under: a CSS request Vite treats as such. */
export const styleId = styleIds.block;

/** The component a style id belongs to, as written in the id. */
const ownerOf = (id: string) => id.slice(0, id.search(SUFFIX));

// The same loader @fluixi-ui/tokens ships beside each slice: one <link>, added once.
const loader = (name: string) =>
  `const href = new URL(${JSON.stringify(`./${name}`)}, import.meta.url).href;
if (typeof document !== 'undefined' && !document.querySelector(\`link[data-fx-css="\${href}"]\`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.fxCss = href;
  document.head.appendChild(link);
}
`;

export function createComponentStyles(compile: CompileWithStyles) {
  let api: CssApi | undefined;
  let server: DevServer | undefined;
  let root = process.cwd();
  // A library build (`build.lib`): the directory its entry is in, which its output mirrors.
  let library: string | undefined;
  // What a library build writes: the file under the output directory, and its CSS.
  const emitted = new Map<string, string>();
  // A module id is a file path, or, for modules a plugin imports by URL (`/src/routes/…`),
  // a path from the project root.
  const fileOf = (id: string) => (existsSync(id) ? id : join(root, id));
  // The CSS of each module's blocks, with the source it came from, for `load` and for telling
  // what changed.
  const cache = new Map<string, { source: string; css: string[]; maps: unknown[]; literals: Map<string, string> }>();

  const resolveReference = async (
    ref: StyleReference,
    importer: string,
    ctx: ResolveContext,
    seen: Set<string>,
  ): Promise<StyleNode[] | null> => {
    const resolved = await ctx.resolve?.(ref.source, importer);
    if (!resolved) return null;
    const file = resolved.id.split('?')[0]!;
    if (seen.has(file)) return null;
    let code: string;
    try {
      code = readFileSync(fileOf(file), 'utf8');
    } catch {
      return null;
    }
    const styles = api!.styles(file);
    let result = compile(code, file, styles);
    // A value that composes values from further away: those first.
    if (result?.styleReferences?.length) {
      const imported = await resolveAll(result.styleReferences, file, ctx, new Set([...seen, file]));
      result = compile(code, file, { ...styles, imported });
    }
    const literal = result?.styleLiterals?.find((l) => l.name === ref.name);
    return literal ? styles.process(literal.css, file) : null;
  };

  const resolveAll = async (refs: StyleReference[], importer: string, ctx: ResolveContext, seen: Set<string>) => {
    const imported = new Map<string, StyleNode[]>();
    for (const ref of refs) {
      const nodes = await resolveReference(ref, importer, ctx, seen);
      if (nodes) imported.set(`${ref.source}#${ref.name}`, nodes);
    }
    return imported;
  };

  const run = async (code: string, id: string, ctx: ResolveContext): Promise<Compiled | null> => {
    // One name per file, whatever id it was reached by (`/src/…` from a plugin, an absolute
    // path from `load`): the scope id is derived from it, and the elements and the CSS have to
    // agree on it.
    const file = fileOf(id);
    const styles = api!.styles(file);
    let result = compile(code, file, styles);
    if (result?.styleReferences?.length) {
      const imported = await resolveAll(result.styleReferences, id, ctx, new Set([file]));
      result = compile(code, file, { ...styles, imported });
    }
    const css = (result?.styles ?? []).map((s) => s.css);
    const maps = (result?.styles ?? []).map((s) => s.map ?? null);
    const literals = new Map((result?.styleLiterals ?? []).map((l) => [l.name, l.css] as const));
    const before = cache.get(file);
    cache.set(file, { source: code, css, maps, literals });
    // A block whose CSS changed (its own edit, or a value it composes from another module) is
    // reloaded: its module id did not change, so nothing else would tell Vite.
    if (server && before) {
      for (let i = 0; i < css.length; i++) {
        if (before.css[i] === css[i]) continue;
        const mod = server.moduleGraph.getModuleById(styleId(file, i));
        if (mod) void server.reloadModule(mod as never);
      }
    }
    // Page stylesheets are imported for their effect; a shadow element's blocks already reach
    // its class through the `?inline` imports the compiler wrote.
    const page = (result?.styles ?? []).flatMap((s, i) => (s.shadow ? [] : [i]));
    if (!result || page.length === 0) return result;
    if (library) {
      // A package ships a module's CSS as one file next to it, its blocks in source order,
      // imported relatively: any bundler that takes a `.css` import takes it, and nothing in
      // it needs this plugin. The `.css.js` beside it is for a page with no bundler: an import
      // map points the stylesheet's url at it, and it adds the sheet as a <link>.
      const name = `${basename(file, extname(file))}.css`;
      if (existsSync(join(dirname(file), name))) {
        throw new Error(`[fluixi] ${file} has <style> blocks, and ${name} next to it would be overwritten by their CSS. Rename one of them.`);
      }
      const out = join(relative(library, dirname(file)), name);
      emitted.set(out, page.map((i) => css[i]!).join('\n'));
      emitted.set(`${out}.js`, loader(name));
      return { ...result, code: `${result.code}\nimport ${JSON.stringify(`./${name}`)};` };
    }
    const imports = page.map((i) => `\nimport ${JSON.stringify(styleId(file, i))};`).join('');
    return { ...result, code: result.code + imports };
  };

  return {
    /** Looks for @fluixi-css/vite among the plugins; without it component styles stay off. */
    connect(plugins: readonly unknown[] | undefined, projectRoot?: string): void {
      if (projectRoot) root = projectRoot;
      api = (plugins ?? [])
        .map((p) => (p as { api?: { fluixiCss?: CssApi } } | null)?.api?.fluixiCss)
        .find((a): a is CssApi => Boolean(a));
      api?.useComponentStyles();
    },
    /** Turns on library output, from the directory of a `build.lib` entry. */
    setLibrary(entryDir: string | undefined): void {
      library = entryDir;
    },
    /** A library build's style import: left for the package's consumer to bundle. */
    isLibraryImport(id: string, importer: string | undefined): boolean {
      if (library === undefined || !importer || !id.startsWith('./') || !id.endsWith('.css')) return false;
      return emitted.has(join(relative(library, dirname(fileOf(importer))), id));
    },
    /** The style files a library build writes, by path under the output directory. */
    libraryFiles(): ReadonlyMap<string, string> {
      return emitted;
    },
    get active(): boolean {
      return api !== undefined;
    },
    setServer(dev: DevServer): void {
      server = dev;
    },
    isStyle(id: string): boolean {
      return STYLE_ID.test(id) || LITERAL_ID.test(id);
    },
    /**
     * A style request as the module id Vite keeps: its owner's absolute path, then the suffix.
     * One id per block however it was asked for (`/src/card.tsx.fx-0.css` from a page, the
     * absolute path from the component), or the reload after an edit misses the copy in use.
     * A css`` value imported from another module names that module relatively, as written.
     */
    async resolveId(id: string, importer: string | undefined, ctx: ResolveContext): Promise<string | null> {
      const at = id.search(SUFFIX);
      const owner = id.slice(0, at);
      if (!owner.startsWith('.')) return fileOf(owner) + id.slice(at);
      const resolved = importer ? await ctx.resolve?.(owner, importer) : null;
      return resolved ? resolved.id.split('?')[0]! + id.slice(at) : null;
    },
    /**
     * The style modules of a changed file, for the update Vite sends. Their ids do not name the
     * file (they end in `.css`), so Vite would not find them itself.
     */
    hotModules(file: string, graph: { getModulesByFile(file: string): Set<unknown> | undefined }): unknown[] {
      const entry = cache.get(file);
      if (!entry) return [];
      const paths = [
        ...entry.css.map((_, i) => styleId(file, i)),
        ...[...entry.literals.keys()].map((name) => styleIds.literal(file, name).replace(/\?inline$/, '')),
      ];
      return paths.flatMap((path) => [...(graph.getModulesByFile(path) ?? [])]);
    },
    compile: run,
    /**
     * A block's CSS and its map back to the module, compiling the module again when the cache
     * does not match the file.
     */
    async load(id: string, ctx: ResolveContext): Promise<{ code: string; map: unknown; moduleType: 'css' } | null> {
      const match = STYLE_ID.exec(id);
      const literal = LITERAL_ID.exec(id);
      if ((!match && !literal) || !api) return null;
      const file = ownerOf(id);
      let source: string;
      try {
        source = readFileSync(fileOf(file), 'utf8');
      } catch {
        return null;
      }
      if (cache.get(fileOf(file))?.source !== source) await run(source, file, ctx);
      const entry = cache.get(fileOf(file));
      if (literal) {
        const css = entry?.literals.get(literal[1]!);
        if (css === undefined) throw new Error(`[fluixi] ${literal[1]} in ${file} is not a css\`\` value, so it cannot be a shadow root's styles.`);
        return { code: css, map: null, moduleType: 'css' };
      }
      const index = Number(match![1]);
      return { code: entry?.css[index] ?? '', map: entry?.maps[index] ?? null, moduleType: 'css' };
    },
  };
}
