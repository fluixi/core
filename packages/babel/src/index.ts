/**
 * @fileoverview @fluixi/babel-plugin-jsx: thin adapter.
 * @module @fluixi/babel-plugin-jsx
 *
 * The JSX transform now lives in @fluixi/compiler (the host-agnostic compiler:
 * IR + pluggable codegen backends). This package is kept as a stable, familiar
 * entry point and simply re-exports the compiler's babel front-end, so existing
 * `['@fluixi/babel-plugin-jsx', options]` configs keep working unchanged.
 */
export {
  default,
  babelPluginReactiveJSX,
  createPlugin,
  createPreset,
  presets,
} from '@fluixi/compiler/babel';
export type { PluginOptions } from '@fluixi/compiler/babel';
export * from '@fluixi/compiler/babel';
