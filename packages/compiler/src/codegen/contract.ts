/**
 * The RuntimeContract is the exact set of runtime symbols a codegen backend may
 * emit, paired with the module they import from and a version number. Backend
 * and runtime evolve in lockstep: adding a primitive bumps the version, so old
 * and new backends/runtimes can coexist during a migration.
 */
export interface RuntimeContract {
  version: number;
  /** module the emitted symbols are imported from */
  module: string;
  symbols: readonly string[];
}

/**
 * v1 — the imperative fine-grained runtime, locked by the @fluixi/dom contract
 * tests (createNativeElement/insert/spread/delegateEvents/createComponent + the
 * control-flow components).
 */
export const RUNTIME_CONTRACT_V1: RuntimeContract = {
  version: 1,
  module: '@fluixi/dom',
  symbols: [
    'createNativeElement',
    'insert',
    'spread',
    'setAttribute',
    'delegateEvents',
    'createComponent',
    'createMemo',
    'untrack',
    'Show', 'For', 'Index', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary',
  ],
};

/**
 * v2 — adds the Solid-style (but ours) template-clone primitives. A future
 * template-clone backend targets this contract; the runtime gains template()/
 * cloneTemplate()/walk() at the same time.
 */
export const RUNTIME_CONTRACT_V2: RuntimeContract = {
  version: 2,
  module: '@fluixi/dom',
  symbols: [...RUNTIME_CONTRACT_V1.symbols, 'template', 'cloneTemplate', 'walk'],
};
