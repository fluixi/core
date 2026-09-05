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

// Every declaration the four packages ship, keyed by its path inside the repo. Lazy: the
// text is only fetched when someone opens the editor.
const DECLARATIONS = import.meta.glob('../../packages/{core,dom,reactive,jsx}/dist/**/*.d.ts', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** specifier → the declaration file it should resolve to, relative to the package root. */
const BARRELS: Record<string, string> = {
  '@fluixi/core': 'dist/src/index',
  '@fluixi/core/router': 'dist/src/lib/router/index',
  '@fluixi/dom': 'dist/index',
  '@fluixi/dom/runtime': 'dist/lib/dom/runtime',
  '@fluixi/dom/utils': 'dist/lib/dom/utils',
  '@fluixi/reactive': 'dist/lib/index',
  '@fluixi/reactive/signal': 'dist/lib/signal/index',
  '@fluixi/reactive/store': 'dist/lib/store/index',
  '@fluixi/jsx': 'dist/index',
};

let loaded: Promise<void> | null = null;

/**
 * Hand the declarations to the TypeScript worker. Called once; the editor stays usable while
 * it runs, and types sharpen when it lands.
 */
export function loadPackageTypes(): Promise<void> {
  if (loaded) return loaded;

  loaded = (async () => {
    const ts = monaco.languages.typescript.typescriptDefaults;

    await Promise.all(
      Object.entries(DECLARATIONS).map(async ([path, read]) => {
        // ../../packages/core/dist/src/index.d.ts → @fluixi/core/dist/src/index.d.ts
        const match = /packages\/([^/]+)\/(dist\/.*)$/.exec(path);
        if (!match) return;
        const [, pkg, rest] = match;
        ts.addExtraLib(await read(), `file:///node_modules/@fluixi/${pkg}/${rest}`);
      }),
    );

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
  })();

  return loaded;
}
