/**
 * One copy of the framework per app. A library built against its own install of
 * `@fluixi/core` (fluixi-ui, a feature package) otherwise brings a second copy: two reactive
 * graphs, two router contexts, two caches, and state written through one is invisible to the
 * other. Vite's `dedupe` resolves each listed package from the app's root instead.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The framework packages that hold state or identity: contexts, signals, caches, the request. */
export const FRAMEWORK_PACKAGES = [
  '@fluixi/core',
  '@fluixi/dom',
  '@fluixi/reactive',
  '@fluixi/router',
  '@fluixi/head',
  '@fluixi/jsx',
  '@fluixi/server',
  '@fluixi/storage',
  '@fluixi/utils',
] as const;

/** Installed where the app's resolution would find it: its node_modules or a parent's. */
function installed(root: string, name: string): boolean {
  for (let dir = root; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'node_modules', name))) return true;
    if (dirname(dir) === dir) return false;
  }
}

export function dedupeVitePlugin(root: string) {
  // Only what the app can resolve: deduping a package it cannot reach makes every import of it fail.
  const dedupe = FRAMEWORK_PACKAGES.filter((name) => installed(root, name));
  return {
    name: 'fluixi-dedupe',
    config: () => ({ resolve: { dedupe } }),
  };
}
