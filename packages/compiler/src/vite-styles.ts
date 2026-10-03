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
import { join } from 'node:path';
import type { StyleNode, StyleOptions, StyleReference } from './transform/styles.js';

/** What @fluixi-css/vite offers, as far as this file needs. */
interface CssApi {
  styles(from: string): StyleOptions;
  useComponentStyles(): void;
}

interface Compiled {
  code: string;
  styles?: { css: string }[];
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

const STYLE_ID = /\?fx-style&index=(\d+)&lang\.css$/;

/** The id a component's n-th style block is served under: a CSS request Vite treats as such. */
export const styleId = (file: string, index: number) => `${file}?fx-style&index=${index}&lang.css`;

export function createComponentStyles(compile: CompileWithStyles) {
  let api: CssApi | undefined;
  let server: DevServer | undefined;
  let root = process.cwd();
  // A module id is a file path, or, for modules a plugin imports by URL (`/src/routes/…`),
  // a path from the project root.
  const fileOf = (id: string) => (existsSync(id) ? id : join(root, id));
  // The CSS of each module's blocks, with the source it came from, for `load` and for telling
  // what changed.
  const cache = new Map<string, { source: string; css: string[] }>();

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
      if (imported.size) result = compile(code, file, { ...styles, imported });
    }
    const css = (result?.styles ?? []).map((s) => s.css);
    const before = cache.get(file);
    cache.set(file, { source: code, css });
    // A block whose CSS changed (its own edit, or a value it composes from another module) is
    // reloaded: its module id did not change, so nothing else would tell Vite.
    if (server && before) {
      for (let i = 0; i < css.length; i++) {
        if (before.css[i] === css[i]) continue;
        const mod = server.moduleGraph.getModuleById(styleId(id, i));
        if (mod) void server.reloadModule(mod as never);
      }
    }
    if (!result || css.length === 0) return result;
    const imports = css.map((_, i) => `\nimport ${JSON.stringify(styleId(id, i))};`).join('');
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
    get active(): boolean {
      return api !== undefined;
    },
    setServer(dev: DevServer): void {
      server = dev;
    },
    isStyle(id: string): boolean {
      return STYLE_ID.test(id);
    },
    compile: run,
    /** A block's CSS, compiling its module again when the cache does not match the file. */
    async load(id: string, ctx: ResolveContext): Promise<string | null> {
      const match = STYLE_ID.exec(id);
      if (!match || !api) return null;
      const file = id.slice(0, id.indexOf('?'));
      let source: string;
      try {
        source = readFileSync(fileOf(file), 'utf8');
      } catch {
        return null;
      }
      if (cache.get(fileOf(file))?.source !== source) await run(source, file, ctx);
      return cache.get(fileOf(file))?.css[Number(match[1])] ?? '';
    },
  };
}
