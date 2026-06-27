// In-browser JSX → imperative runtime, via @babel/standalone hosting the real Fluixi babel plugin.
import * as Babel from '@babel/standalone';
// default export is the babel plugin
import fluixiPlugin from '@fluixi/compiler/babel';

let registered = false;
function ensure() {
  if (registered) return;
  (Babel as unknown as { registerPlugin(n: string, p: unknown): void }).registerPlugin('fluixi', fluixiPlugin);
  registered = true;
}

// Compile a JSX/TSX snippet to imperative code (createNativeElement/insert/…). Throws on syntax error.
export function compile(code: string): string {
  ensure();
  const out = Babel.transform(code, {
    filename: 'snippet.tsx',
    configFile: false,
    babelrc: false,
    presets: [['typescript', { isTSX: true, allExtensions: true, jsxPragma: 'jsx' }]],
    plugins: [['fluixi', { backend: 'imperative' }]],
    sourceMaps: false,
  });
  return out.code ?? '';
}
