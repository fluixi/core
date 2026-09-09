// Turn a project into running code.
//
// Each file becomes a real ES module behind a blob URL, so `import` is the engine's, not a
// regex's: live bindings, top-level await, and the same errors an application would get. The
// previous playground rewrote imports into destructures from a fixed four-entry map, which is
// why nothing outside @fluixi/dom could be imported at all.
//
// A blob URL has to exist before anything can reference it, so files are linked in dependency
// order. That leaves import cycles unrepresentable; they are reported rather than half-run.
import { compileFileWithOrigin, type CompiledFile, type Position } from './compile';
import { createRegistry } from './modules';
import type { Project, ProjectFile } from './project';

const SOURCE = /\.(tsx?|jsx?)$/;
const STYLE = /\.css$/;
const DATA = /\.json$/;
const RESOLVE_ORDER = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

/** Every specifier a module imports, with the span to rewrite. */
const IMPORT_SPECIFIER = /(\bfrom\s*|\bimport\s*|\bexport\s*\*\s*from\s*|\bimport\()(['"])([^'"]+)\2/g;

export function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

/** Resolve a relative specifier against the importing file, trying the usual extensions. */
export function resolveRelative(from: string, specifier: string, files: ProjectFile[]): string | null {
  const base = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  const segments = (base ? base.split('/') : []).concat(specifier.split('/'));
  const stack: string[] = [];
  for (const segment of segments) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') stack.pop();
    else stack.push(segment);
  }
  const target = stack.join('/');
  for (const suffix of RESOLVE_ORDER) {
    const candidate = target + suffix;
    if (files.some((f) => f.path === candidate)) return candidate;
  }
  return null;
}

export function specifiersOf(code: string): string[] {
  const found: string[] = [];
  for (const match of code.matchAll(IMPORT_SPECIFIER)) found.push(match[3]);
  return found;
}

/** Dependency-first ordering. Returns the cycle instead when the graph has one. */
export function orderFiles(files: ProjectFile[], entry: string): { order: string[]; cycle: string[] | null } {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  let cycle: string[] | null = null;

  const visit = (path: string, trail: string[]): void => {
    if (cycle) return;
    const seen = state.get(path);
    if (seen === 'done') return;
    if (seen === 'visiting') {
      cycle = [...trail.slice(trail.indexOf(path)), path];
      return;
    }
    state.set(path, 'visiting');
    const file = files.find((f) => f.path === path);
    if (file && SOURCE.test(path)) {
      for (const specifier of specifiersOf(file.code)) {
        if (!isRelative(specifier)) continue;
        const target = resolveRelative(path, specifier, files);
        if (target) visit(target, [...trail, path]);
      }
    }
    state.set(path, 'done');
    order.push(path);
  };

  visit(entry, []);
  for (const file of files) if (SOURCE.test(file.path)) visit(file.path, []);
  return { order, cycle };
}

export interface LinkResult {
  entryUrl: string;
  compiled: Map<string, string>;
  /** Non-source files as urls, for the html shell's own `<link>` and `<img>` to point at. */
  assets: Map<string, string>;
  /** `//# sourceURL` gets the file right; the line is compiled. This knows both maps. */
  origin(file: string, at: Position): Position | undefined;
  revoke: () => void;
}

/**
 * Compile every source file and wire them together. Bare specifiers resolve through a shim
 * module that re-exports the registry entry, so `import { render } from '@fluixi/core'` reaches
 * the real package.
 */
export async function linkProject(
  project: Project,
  registry: Record<string, Record<string, unknown>>,
): Promise<LinkResult> {
  const files = project.files;
  const { order, cycle } = orderFiles(files, project.entry);
  if (cycle) {
    throw new Error(`Import cycle: ${cycle.join(' → ')}. The playground links files in dependency order.`);
  }

  const urls: string[] = [];
  const track = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urls.push(url);
    return url;
  };

  // One shim per bare specifier actually used, re-exporting from the registry the preview
  // publishes. The names are read here, from the same packages, but the values come from
  // whichever realm ends up running the code — the preview is an iframe, and a function
  // taken from this document would build its DOM in the wrong one.
  const shims = new Map<string, string>();
  const shimFor = (specifier: string): string => {
    const existing = shims.get(specifier);
    if (existing) return existing;
    const namespace = registry[specifier];
    if (!namespace) {
      throw new Error(
        `Cannot resolve "${specifier}". The playground bundles ${Object.keys(registry).sort().join(', ')}.`,
      );
    }
    const names = Object.keys(namespace).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && n !== 'default');
    const body =
      `const ns = globalThis[Symbol.for('fluixi.playground.registry')][${JSON.stringify(specifier)}];\n` +
      names.map((n) => `export const ${n} = ns[${JSON.stringify(n)}];`).join('\n') +
      `\nexport default ns;\n`;
    const url = track(new Blob([body], { type: 'text/javascript' }));
    shims.set(specifier, url);
    return url;
  };

  const moduleUrls = new Map<string, string>();
  const compiled = new Map<string, string>();
  /** Per file: a position in its compiled output, put back in the author's file. */
  const origins = new Map<string, CompiledFile['origin']>();
  /** What a non-source file resolves to, for `index.html` to point at. */
  const assets = new Map<string, string>();

  // Styles and data first: a module importing one needs its url before it is linked.
  for (const file of files) {
    if (STYLE.test(file.path)) {
      // What a bundler does with `import './styles.css'`: run it for its effect. The blob is
      // evaluated in the preview's realm, so `document` is the page being styled.
      const body =
        `const css = ${JSON.stringify(file.code)};\n` +
        `const el = document.createElement('style');\n` +
        `el.setAttribute('data-fx-style', ${JSON.stringify(file.path)});\n` +
        `el.textContent = css;\n` +
        `document.head.appendChild(el);\n` +
        `export default css;\n`;
      moduleUrls.set(file.path, track(new Blob([body], { type: 'text/javascript' })));
      assets.set(file.path, track(new Blob([file.code], { type: 'text/css' })));
    } else if (DATA.test(file.path)) {
      const body = `export default ${file.code.trim() || 'null'};\n`;
      moduleUrls.set(file.path, track(new Blob([body], { type: 'text/javascript' })));
      assets.set(file.path, track(new Blob([file.code], { type: 'application/json' })));
    }
  }

  for (const path of order) {
    const file = files.find((f) => f.path === path);
    if (!file || !SOURCE.test(path)) continue;

    const { code, origin } = await compileFileWithOrigin(file.code, path);
    compiled.set(path, code);
    origins.set(path, origin);

    const linked = code.replace(IMPORT_SPECIFIER, (whole, lead: string, quote: string, specifier: string) => {
      if (isRelative(specifier)) {
        const target = resolveRelative(path, specifier, files);
        const url = target ? moduleUrls.get(target) : undefined;
        if (!url) throw new Error(`${path}: cannot resolve "${specifier}".`);
        return `${lead}${quote}${url}${quote}`;
      }
      return `${lead}${quote}${shimFor(specifier)}${quote}`;
    });

    // Name the module after its file: a stack trace otherwise reports `blob:http://…/9f2c`,
    // and devtools reads stacks to place dom bindings and setters.
    const named = `${linked}\n//# sourceURL=${path}\n`;
    moduleUrls.set(path, track(new Blob([named], { type: 'text/javascript' })));
  }

  const origin = (file: string, at: Position): Position | undefined => origins.get(file)?.(at);

  const entryUrl = moduleUrls.get(project.entry);
  if (!entryUrl) throw new Error(`No entry module: ${project.entry}`);

  return {
    entryUrl,
    compiled,
    assets,
    origin,
    revoke() {
      for (const url of urls) URL.revokeObjectURL(url);
    },
  };
}
