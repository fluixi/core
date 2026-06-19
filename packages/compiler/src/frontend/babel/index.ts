/**
 * @fileoverview Babel front-end adapter for the Fluixi compiler.
 * @module @fluixi/compiler/babel
 *
 * This is one of the compiler's front-end adapters: it parses with @babel and
 * runs the JSX transform. The transform/codegen it currently performs is the
 * existing behaviour (emits the jsx() automatic runtime) — switching codegen to
 * the IR-driven backends (see ../../codegen) is a later step. SWC/other
 * front-ends will plug in alongside this without touching the rest of the pipeline.
 */

// Export the main plugin
export { default } from './plugin.js';
export type { PluginOptions } from './plugin.js';

// Export types
export * from './types.js';

// Re-export for convenience
import plugin from './plugin.js';

/** Named export for explicit usage */
export const babelPluginReactiveJSX = plugin;

/** Helper to create plugin with options */
export function createPlugin(options?: any) {
  return [plugin, options];
}

/** Preset with recommended configuration */
export function createPreset(options: any = {}) {
  return {
    plugins: [
      [
        plugin,
        {
          runtime: 'automatic',
          importSource: '@fluixi/jsx',
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

/** Quick setup presets */
export const presets = {
  production: createPreset({
    development: false,
    hoistStatics: true,
    delegateEvents: true,
    optimizeControlFlow: true,
  }),
  development: createPreset({
    development: true,
    hoistStatics: false,
    sourceMaps: true,
  }),
  minimal: createPreset({
    detectReactivity: false,
    useLitHTML: false,
    hoistStatics: false,
    delegateEvents: false,
    optimizeControlFlow: false,
  }),
};
