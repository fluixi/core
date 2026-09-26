/**
 * Which `@fluixi/start` the CLI runs, against the one the app resolves.
 *
 * The CLI imports `@fluixi/start` from its own location. When the app's copy does not
 * satisfy the CLI's pinned version (a workspace link, an app pinned to an older release),
 * the package manager nests another copy under the CLI, and every command silently runs
 * that one. Edits to the app's copy then have no effect, and nothing says why.
 */
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

export interface StartCopy {
  dir: string;
  version: string;
}

function locate(from: string): StartCopy | null {
  try {
    const file = createRequire(from).resolve('@fluixi/start/package.json');
    return { dir: dirname(realpathSync(file)), version: createRequire(from)(file).version };
  } catch {
    return null;
  }
}

/** Both copies when they differ, else null. */
export function startMismatch(appRoot: string, cliFile: string): { app: StartCopy; cli: StartCopy } | null {
  const app = locate(join(appRoot, 'package.json'));
  const cli = locate(cliFile);
  if (!app || !cli || app.dir === cli.dir) return null;
  return { app, cli };
}
