// Turn a project into running code.
//
// Each file becomes a real ES module behind a blob URL, so `import` is the engine's, not a
// regex's: live bindings, top-level await, and the same errors an application would get. The
// previous playground rewrote imports into destructures from a fixed four-entry map, which is
// why nothing outside @fluixi/dom could be imported at all.
//
// A blob URL has to exist before anything can reference it, so files are linked in dependency
// order. That leaves import cycles unrepresentable; they are reported rather than half-run.
import { compileFile } from './compile';
import { createRegistry } from './modules';
import type { Project, ProjectFile } from './project';

const SOURCE = /\.(tsx?|jsx?)$/;
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

  // One shim per bare specifier actually used, re-exporting the registry namespace by name.
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
    const key = `__fx_registry_${shims.size}`;
    (globalThis as Record<string, unknown>)[key] = namespace;
    const names = Object.keys(namespace).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && n !== 'default');
    const body =
      `const ns = globalThis[${JSON.stringify(key)}];\n` +
      names.map((n) => `export const ${n} = ns[${JSON.stringify(n)}];`).join('\n') +
      `\nexport default ns;\n`;
    const url = track(new Blob([body], { type: 'text/javascript' }));
    shims.set(specifier, url);
    return url;
  };

  const moduleUrls = new Map<string, string>();
  const compiled = new Map<string, string>();

  for (const path of order) {
    const file = files.find((f) => f.path === path);
    if (!file || !SOURCE.test(path)) continue;

    const code = await compileFile(file.code, path);
    compiled.set(path, code);

    const linked = code.replace(IMPORT_SPECIFIER, (whole, lead: string, quote: string, specifier: string) => {
      if (isRelative(specifier)) {
        const target = resolveRelative(path, specifier, files);
        const url = target ? moduleUrls.get(target) : undefined;
        if (!url) throw new Error(`${path}: cannot resolve "${specifier}".`);
        return `${lead}${quote}${url}${quote}`;
      }
      return `${lead}${quote}${shimFor(specifier)}${quote}`;
    });

    moduleUrls.set(path, track(new Blob([linked], { type: 'text/javascript' })));
  }

  const entryUrl = moduleUrls.get(project.entry);
  if (!entryUrl) throw new Error(`No entry module: ${project.entry}`);

  return {
    entryUrl,
    compiled,
    revoke() {
      for (const url of urls) URL.revokeObjectURL(url);
    },
  };
}
