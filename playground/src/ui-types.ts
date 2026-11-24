// fluixi-ui's declarations for the editor, in a chunk of their own: about 190 files that only a
// project importing `@fluixi-ui/*` needs. Same layout as ./types.ts: each declaration at its path
// under file:///node_modules, and a barrel for every specifier the export map offers.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { componentGlobals } from '@fluixi-ui/resolver/globals';

const DECLARATIONS = import.meta.glob('../node_modules/@fluixi-ui/*/dist/**/*.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

type ExportMap = Record<string, string | { types?: string }>;
const MANIFESTS = import.meta.glob('../node_modules/@fluixi-ui/*/package.json', {
  import: 'exports',
  eager: true,
}) as Record<string, ExportMap | undefined>;

export function addUiTypes(): void {
  const ts = monaco.languages.typescript.typescriptDefaults;
  for (const [path, code] of Object.entries(DECLARATIONS)) {
    const match = /@fluixi-ui\/([^/]+)\/(dist\/.*)$/.exec(path);
    if (match) ts.addExtraLib(code, `file:///node_modules/@fluixi-ui/${match[1]}/${match[2]}`);
  }
  for (const [path, exports] of Object.entries(MANIFESTS)) {
    const pkg = /@fluixi-ui\/([^/]+)\/package\.json$/.exec(path)?.[1];
    if (!pkg || !exports) continue;
    for (const [key, target] of Object.entries(exports)) {
      const types = typeof target === 'object' ? target.types : undefined;
      if (!types) continue;
      // '.' → index.d.ts at the package root; './skin' → skin/index.d.ts, one level down.
      const sub = key === '.' ? '' : key.slice(2);
      const up = sub ? '../'.repeat(sub.split('/').length) : './';
      ts.addExtraLib(
        `export * from '${up}${types.slice(2).replace(/\.d\.ts$/, '')}';\n`,
        `file:///node_modules/@fluixi-ui/${pkg}/${sub ? `${sub}/` : ''}index.d.ts`,
      );
    }
  }
  // The tags the compiler resolves without an import, as the project's own declaration would
  // list them in an app.
  ts.addExtraLib(componentGlobals().source, 'file:///node_modules/@fluixi-ui/resolver/components.d.ts');
}
