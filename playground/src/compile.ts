// In-browser JSX → imperative runtime, via @babel/standalone hosting the real Fluixi babel plugin.
// Babel (~2-3 MB) is dynamically imported on first compile, so it's not in the initial bundle —
// the editor loads fast and babel only ships when you hit Run.
type BabelStandalone = {
  registerPlugin(name: string, plugin: unknown): void;
  transform(code: string, opts: unknown): { code?: string };
};

let babel: BabelStandalone | null = null;
let loading: Promise<BabelStandalone> | null = null;

async function ensureBabel(): Promise<BabelStandalone> {
  if (babel) return babel;
  if (!loading) {
    loading = Promise.all([import('@babel/standalone'), import('@fluixi/compiler/babel')]).then(
      ([Babel, plugin]) => {
        const b = Babel as unknown as BabelStandalone;
        b.registerPlugin('fluixi', (plugin as { default: unknown }).default);
        babel = b;
        return b;
      },
    );
  }
  return loading;
}

// Compile a JSX/TSX snippet to imperative code (createNativeElement/insert/…). Throws on syntax error.
export async function compile(code: string): Promise<string> {
  const b = await ensureBabel();
  const out = b.transform(code, {
    filename: 'snippet.tsx',
    configFile: false,
    babelrc: false,
    presets: [['typescript', { isTSX: true, allExtensions: true, jsxPragma: 'jsx' }]],
    plugins: [['fluixi', { backend: 'imperative' }]],
    sourceMaps: false,
  });
  return out.code ?? '';
}
