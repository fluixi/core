import type { ComponentResolverRule } from './resolve/component-resolver.js';

/**
 * Public compiler options. This schema is the stable public API — it stays put
 * as backends change. Switching DOM strategy is `backend`, not a rewrite.
 */
export interface CompilerOptions {
  /**
   * Clone static subtrees from a `<template>` instead of building them element by
   * element. Roughly 2x faster to instantiate, but **client-only**: `createTemplate`
   * produces real DOM nodes, which the SSR renderer's ServerElement tree rejects, and a
   * clone creates a fresh node where hydration must adopt the existing one. Opt in for
   * a client-rendered app; leave off wherever SSR or hydration is involved.
   */
  templateClone?: boolean;
  /**
   * Also clone subtrees whose *structure* is static but which contain dynamic holes —
   * the common shape. Roughly halves the emitted code for such a subtree and replaces
   * per-element construction with one clone.
   *
   * Works under SSR and hydration: each hole is bracketed by `<!--fx-->` markers, so its
   * content is exactly the nodes between them and the server's markup has the same shape
   * as the client's template. Hydration adopts those nodes rather than rebuilding them.
   */
  partialTemplates?: boolean;

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
