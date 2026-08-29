/**
 * `@fluixi/start/router` — the app-facing routing surface, re-exported from
 * `@fluixi/core/router` (the framework-agnostic `@fluixi/router` core + its
 * fluixi adapter). Importing routing from the meta-framework gives apps a single,
 * stable dependency surface — they don't reach into fluixi internals:
 *
 *   import { Router, Outlet, Link, createMemoryHistory } from '@fluixi/start/router';
 *
 * Framework primitives (Suspense, lazy, signals, components) still come from
 * `@fluixi/core` — only routing lives here.
 */
export * from '@fluixi/core/router';
