/**
 * `@fluixi/start/router` — the app-facing routing surface, re-exported from
 * `@fluixi/kettlejs/router-next` (the framework-agnostic `@fluixi/router` core + its
 * kettlejs adapter). Importing routing from the meta-framework gives apps a single,
 * stable dependency surface — they don't reach into kettlejs internals:
 *
 *   import { Router, Outlet, Link, createMemoryHistory } from '@fluixi/start/router';
 *
 * Framework primitives (Suspense, lazy, signals, components) still come from
 * `@fluixi/kettlejs` — only routing lives here.
 */
export * from '@fluixi/kettlejs/router-next';
