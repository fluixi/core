/**
 * `@fluixi/start/di`: the app's import of `@fluixi/di`. Packages import `@fluixi/di` itself, so
 * they do not depend on the meta-framework; this module only re-exports it, and bundlers keep
 * only what is used.
 */
export * from '@fluixi/di';
