// Export the main plugin
export { default } from './plugin.js';
export type { PluginOptions } from './plugin.js';

export * from './types.js';

// Re-export for convenience
import plugin from './plugin.js';

/** Named export for explicit usage */
export const babelPluginReactiveJSX = plugin;

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
          useHtmlTag: true,
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
    useHtmlTag: false,
    hoistStatics: false,
    delegateEvents: false,
    optimizeControlFlow: false,
  }),
};
