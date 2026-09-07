// Real types for the packages a project imports.
//
// Without these the worker cannot resolve '@fluixi/core' at all, so every import is `any`
// and hovering a name shows nothing. The editor was hiding the reason: "cannot find module"
// is in `diagnosticCodesToIgnore`, so the failure was silent.
//
// Monaco's TypeScript worker resolves the classic node way and does not read `exports`, so
// each package gets a barrel at the path that resolution actually looks for, re-exporting
// the declaration the manifest points at.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Every declaration the four packages ship, keyed by its path inside the repo. Eager: there
// are ~150 of them, and one request each leaves the worker resolving nothing while they
// arrive. In the bundle they are a single payload.
const DECLARATIONS = import.meta.glob('../../packages/{core,dom,reactive,jsx}/dist/**/*.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** specifier → the declaration file it should resolve to, relative to the package root. */
const BARRELS: Record<string, string> = {
  '@fluixi/core': 'dist/src/index',
  '@fluixi/core/router': 'dist/src/lib/router/index',
  '@fluixi/dom': 'dist/index',
  '@fluixi/dom/runtime': 'dist/lib/dom/runtime',
  // What @fluixi/jsx builds JSX.IntrinsicElements from. Missing here, the JSX namespace came
  // out empty and every `<div>` was an unknown element.
  '@fluixi/dom/attributes': 'dist/lib/element/attributes',
  '@fluixi/dom/utils': 'dist/lib/dom/utils',
  '@fluixi/reactive': 'dist/lib/index',
  '@fluixi/reactive/signal': 'dist/lib/signal/index',
  '@fluixi/reactive/store': 'dist/lib/store/index',
  '@fluixi/jsx': 'dist/index',
};

let loaded = false;

/**
 * Hand the declarations to the TypeScript worker.
 *
 * Synchronous, and called before the first model exists: a file checked before its types
 * arrive is a file full of errors that were true for a moment, and the markers do not
 * reliably clear when the libraries land — which is why the same project showed "cannot find
 * module" on one load and nothing on the next.
 */
export function loadPackageTypes(): void {
  if (loaded) return;
  loaded = true;

  const ts = monaco.languages.typescript.typescriptDefaults;

  for (const [path, code] of Object.entries(DECLARATIONS)) {
    // ../../packages/core/dist/src/index.d.ts → @fluixi/core/dist/src/index.d.ts
    const match = /packages\/([^/]+)\/(dist\/.*)$/.exec(path);
    if (!match) continue;
    const [, pkg, rest] = match;
    ts.addExtraLib(code, `file:///node_modules/@fluixi/${pkg}/${rest}`);
  }

  for (const [specifier, target] of Object.entries(BARRELS)) {
    const name = specifier.replace('@fluixi/', '');
    // './dist/…' from the package root, '../dist/…' from a subpath directory. Without the
    // leading './' the re-export reads as a bare specifier and resolves to nothing.
    const depth = name.split('/').length - 1;
    const up = depth ? '../'.repeat(depth) : './';
    ts.addExtraLib(
      `export * from '${up}${target}';\n`,
      `file:///node_modules/@fluixi/${name}/index.d.ts`,
    );
  }
}
