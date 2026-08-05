import type { ComponentResolverRule } from './resolve/component-resolver.js';

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
  /**
   * Rules that resolve an unbound capitalised tag to a module, so a component can be
   * used in a template without an import. See `createComponentResolver`.
   */
  resolve?: readonly ComponentResolverRule[];
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
