/**
 * @fileoverview JSX compiler utilities — thin re-export.
 * @module @fluixi/jsx-runtime/compiler
 *
 * The build-tool integrations (vite/webpack/rollup/esbuild + analysis helpers)
 * now live in @fluixi/compiler. This module is kept so existing imports from
 * '@fluixi/jsx-runtime/compiler' (e.g. createVitePlugin) keep working unchanged.
 */
export * from '@fluixi/compiler/integrations';
export { default } from '@fluixi/compiler/integrations';
