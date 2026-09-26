/**
 * `*.server.*` files never reach the browser.
 *
 * The name is the whole contract: a verifier, a secret, a database client goes in
 * `auth.server.ts`, and the client build fails if anything it bundles imports that file,
 * naming the file that did. Without this the only sign of a leak is a Vite warning about
 * an externalized `node:` module, or nothing at all when the code needs no builtin.
 *
 * Checked when an import is resolved, so a lazy `import()` counts: Vite would still emit
 * the file as a chunk in `dist/client`, published whether it ever runs or not. That check
 * only looks at specifiers containing `.server`, which is what keeps it cheap, so loading
 * is checked too: an alias naming the file something else is caught there, with the
 * importer as far as the bundler knows it.
 *
 * One exception: a file whose first statement is `"use server"`. The server-function
 * transform replaces every export with an RPC stub, so the browser gets the stub and the
 * body stays on the server. A `"use server"` inside one function is not enough, since the
 * rest of that file ships as written.
 *
 * App code only. Dependencies are left alone: `.server` is this convention, not theirs.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';

const SERVER_FILE = /\.server\.[cm]?[jt]sx?$/;
// Cheap prefilter on the import specifier, before paying for a resolve.
const MAYBE_SERVER = /\.server(?:\.[cm]?[jt]sx?)?(?:\?|$)/;

/** Whether the file's first statement is a `"use server"` directive. */
export function startsWithUseServer(source: string): boolean {
  const head = source
    .replace(/^﻿/, '')
    .replace(/^(?:\s+|\/\/[^\n]*\n?|\/\*[\s\S]*?\*\/)*/, '');
  return /^['"]use server['"]/.test(head);
}

export function isServerOnlyFile(file: string): boolean {
  const path = file.replace(/\?.*$/, '');
  return SERVER_FILE.test(path) && !/[\\/]node_modules[\\/]/.test(path);
}

/** A `.server` file the browser may still import: one that is all server functions. */
function allowed(file: string): boolean {
  try {
    return startsWithUseServer(readFileSync(file.replace(/\?.*$/, ''), 'utf8'));
  } catch {
    return false;
  }
}

const refusal = (importer: string, file: string) =>
  `${importer} imports ${file} into the browser bundle. ` +
  'A *.server.* file runs on the server only: import it from an API route, middleware, ' +
  'src/app.config.server.ts or a "use server" function instead.';

export function serverOnlyVitePlugin(): any {
  let roots = [process.cwd()];
  // Resolved ids are real paths, and the root may sit behind a symlink (a linked app,
  // macOS /var), so try both before falling back to the absolute path.
  const show = (file: string) => {
    const path = file.replace(/\?.*$/, '');
    return roots.map((r) => relative(r, path)).find((r) => r && !r.startsWith('..')) ?? path;
  };

  return {
    name: 'fluixi-server-only',
    enforce: 'pre',
    configResolved(config: { root?: string }) {
      const root = config.root || process.cwd();
      let real = root;
      try {
        real = realpathSync(root);
      } catch {
        /* keep the configured path */
      }
      roots = [root, real];
    },
    async resolveId(
      this: any,
      source: string,
      importer: string | undefined,
      options?: { ssr?: boolean; scan?: boolean },
    ) {
      // Two callers pass no real importer. The dependency scanner starts at index.html, and
      // Vite's module graph re-resolves an already resolved `/src/...` path with index.html
      // filled in as the default. Both would blame index.html; `load` below catches the same
      // file with the importer the graph actually recorded.
      if (options?.ssr || options?.scan || !importer || !MAYBE_SERVER.test(source)) return null;
      if (source.startsWith('/') && roots.some((r) => importer === join(r, 'index.html'))) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external || !isServerOnlyFile(resolved.id)) return null;

      if (allowed(resolved.id)) return resolved;
      this.error(refusal(show(importer), show(resolved.id)));
      return null;
    },
    load(this: any, id: string, options?: { ssr?: boolean }) {
      if (options?.ssr || !isServerOnlyFile(id) || allowed(id)) return null;
      const info = this.getModuleInfo?.(id);
      const importer = info?.importers?.[0] ?? info?.dynamicImporters?.[0];
      this.error(refusal(importer ? show(importer) : 'A browser module', show(id)));
      return null;
    },
  };
}
