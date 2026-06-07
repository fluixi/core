/**
 * Public compiler options. This schema is the stable public API — it stays put
 * as backends change. Switching DOM strategy is `backend`, not a rewrite.
 */
export interface CompilerOptions {
  /** which codegen backend to use */
  backend?: 'imperative' | 'template-clone';
  /** output target */
  generate?: 'dom' | 'ssr' | 'hydrate';
  /** runtime module emitted symbols are imported from */
  moduleName?: string;
  delegateEvents?: boolean;
  hydratable?: boolean;
  sourceMaps?: boolean;
  dev?: boolean;
}

export const defaultOptions: CompilerOptions = {
  backend: 'imperative',
  generate: 'dom',
  moduleName: '@fluixi/dom',
  delegateEvents: true,
  hydratable: false,
  sourceMaps: true,
  dev: false,
};
