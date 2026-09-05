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

/**
 * Compile one project file. The filename is passed through because babel reports errors against
 * it — with several files open, "Unexpected token" is useless without knowing which one.
 */
export async function compileFile(code: string, filename: string): Promise<string> {
  const b = await ensureBabel();
  const isTSX = /\.(tsx|jsx)$/.test(filename);

  // Two stages, the same two a real app runs. `transformTemplates` resolves the `$`
  // intrinsics into their runtime calls and compiles html`` — the babel plugin never sees
  // `$signal` and would leave it as a free identifier, which is exactly what it did.
  const { transformTemplates } = await import('@fluixi/compiler/transform');
  const pre = transformTemplates(code, filename, {
    runtimeModule: '@fluixi/dom',
    controlFlowModule: '@fluixi/dom',
  });
  const source = pre?.code ?? code;

  const out = b.transform(source, {
    filename,
    configFile: false,
    babelrc: false,
    presets: [['typescript', { isTSX, allExtensions: true, jsxPragma: 'jsx' }]],
    plugins: [['fluixi', { backend: 'imperative' }]],
    sourceMaps: false,
  });
  return out.code ?? '';
}
