/**
 * @fileoverview Babel Plugin for Reactive JSX Transformation
 * @module @awc/babel-plugin-jsx
 *
 * This package provides a comprehensive Babel plugin for transforming JSX
 * with fine-grained reactivity support. It integrates with @awc/jsx-runtime
 * to provide optimal reactive DOM updates.
 *
 * Features:
 * - Automatic JSX runtime transformation
 * - Signal and store detection
 * - Event delegation
 * - Static element hoisting
 * - Control flow optimization
 * - Lit-HTML integration
 */

// Export the main plugin
export { default } from './lib/plugin.js';
export type { PluginOptions } from './lib/plugin.js';

// Export transformation utilities
// export * from './lib/transform.js';

// Export types
export * from './lib/types.js';

// Export signal utilities
// export * from './lib/signal.js';

// Re-export for convenience
import plugin from './lib/plugin.js';

/**
 * Named export for explicit usage
 */
export const babelPluginReactiveJSX = plugin;

/**
 * Helper to create plugin with options
 */
export function createPlugin(options?: any) {
  return [plugin, options];
}

/**
 * Preset with recommended configuration
 */
export function createPreset(options: any = {}) {
  return {
    plugins: [
      [
        plugin,
        {
          runtime: 'automatic',
          importSource: '@awc/jsx-runtime',
          development: process.env.NODE_ENV === 'development',
          detectReactivity: true,
          useLitHTML: true,
          hoistStatics: true,
          delegateEvents: true,
          optimizeControlFlow: true,
          sourceMaps: true,
          ...options,
        },
      ],
    ],
  };
}

/**
 * Quick setup for common bundlers
 */
export const presets = {
  /**
   * Production preset - all optimizations enabled
   */
  production: createPreset({
    development: false,
    hoistStatics: true,
    delegateEvents: true,
    optimizeControlFlow: true,
  }),

  /**
   * Development preset - debugging features enabled
   */
  development: createPreset({
    development: true,
    hoistStatics: false,
    sourceMaps: true,
  }),

  /**
   * Minimal preset - basic transformation only
   */
  minimal: createPreset({
    detectReactivity: false,
    useLitHTML: false,
    hoistStatics: false,
    delegateEvents: false,
    optimizeControlFlow: false,
  }),
};

/**
 * Usage examples in comments for documentation
 *
 * @example Babel Config (.babelrc.js)
 * ```js
 * module.exports = {
 *   plugins: [
 *     ['@awc/babel-plugin-jsx', {
 *       runtime: 'automatic',
 *       importSource: '@awc/jsx-runtime',
 *       development: process.env.NODE_ENV === 'development',
 *     }]
 *   ]
 * }
 * ```
 *
 * @example Vite Config (vite.config.ts)
 * ```ts
 * import { defineConfig } from 'vite'
 * import { babelPluginReactiveJSX } from '@awc/babel-plugin-jsx'
 *
 * export default defineConfig({
 *   plugins: [
 *     {
 *       name: 'babel-reactive-jsx',
 *       transform(code, id) {
 *         if (/\.[jt]sx$/.test(id)) {
 *           return babel.transform(code, {
 *             plugins: [[babelPluginReactiveJSX, options]]
 *           })
 *         }
 *       }
 *     }
 *   ]
 * })
 * ```
 *
 * @example Webpack Config (webpack.config.js)
 * ```js
 * module.exports = {
 *   module: {
 *     rules: [
 *       {
 *         test: /\.[jt]sx?$/,
 *         use: {
 *           loader: 'babel-loader',
 *           options: {
 *             plugins: [
 *               ['@awc/babel-plugin-jsx', { development: true }]
 *             ]
 *           }
 *         }
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * @example Rollup Config (rollup.config.js)
 * ```js
 * import babel from '@rollup/plugin-babel'
 * import { babelPluginReactiveJSX } from '@awc/babel-plugin-jsx'
 *
 * export default {
 *   plugins: [
 *     babel({
 *       babelHelpers: 'bundled',
 *       plugins: [[babelPluginReactiveJSX, options]]
 *     })
 *   ]
 * }
 * ```
 */
