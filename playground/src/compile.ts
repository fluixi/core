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
 * Re-print compiled output so it can be read.
 *
 * The backend emits for a bundler: a whole component arrives as one line, an IIFE holding
 * every dom call it takes to build the tree. Babel is already loaded by the time anything is
 * compiled, and its printer puts statements on their own lines.
 */
export async function formatCompiled(code: string): Promise<string> {
  if (!code.trim()) return code;
  try {
    const b = await ensureBabel();
    const out = b.transform(code, {
      configFile: false,
      babelrc: false,
      compact: false,
      retainLines: false,
      sourceMaps: false,
      presets: [],
      plugins: [],
    });
    return out.code ?? code;
  } catch {
    // Output that cannot be parsed is still output; showing it beats showing nothing.
    return code;
  }
}

/** A position in a file, one-based line and zero-based column, as a stack reports it. */
export interface Position {
  line: number;
  column: number;
}

/** What a compiled file knows about where it came from. */
export interface CompiledFile {
  code: string;
  /** A position in the compiled output, put back in the author's file. */
  origin(at: Position): Position | undefined;
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
    // The playground is a development tool, so every node can say where it came from.
    sourceLocations: true,
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

/**
 * Two passes, so two maps: the template transform rewrites the source before babel does, and
 * a position in the output has to be traced through both. Nothing is looked up until asked.
 */
export async function compileFileWithOrigin(code: string, filename: string): Promise<CompiledFile> {
  const b = await ensureBabel();
  const isTSX = /\.(tsx|jsx)$/.test(filename);
  const { transformTemplates } = await import('@fluixi/compiler/transform');
  const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping');

  const pre = transformTemplates(code, filename, {
    runtimeModule: '@fluixi/dom',
    controlFlowModule: '@fluixi/dom',
    sourceLocations: true,
  });
  const source = pre?.code ?? code;

  const out = b.transform(source, {
    filename,
    configFile: false,
    babelrc: false,
    presets: [['typescript', { isTSX, allExtensions: true, jsxPragma: 'jsx' }]],
    plugins: [['fluixi', { backend: 'imperative' }]],
    sourceMaps: true,
  });

  // No map means the pass did nothing and the position is already right for that stage.
  // `@babel/standalone`'s types stop at `code`, hence the cast.
  const babelMap = (out as { map?: unknown }).map;
  const fromBabel = babelMap ? new TraceMap(babelMap as never) : null;
  const fromTemplates = pre?.map ? new TraceMap(pre.map as never) : null;

  const step = (map: InstanceType<typeof TraceMap> | null, at: Position): Position | undefined => {
    if (!map) return at;
    const found = originalPositionFor(map, { line: at.line, column: at.column });
    return found.line == null ? undefined : { line: found.line, column: found.column ?? 0 };
  };

  return {
    code: out.code ?? '',
    origin(at) {
      const inSource = step(fromBabel, at);
      return inSource && step(fromTemplates, inSource);
    },
  };
}
