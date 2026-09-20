/**
 * Showing a file path at the length a reader wants.
 *
 * A node the framework made carries the path of the file that made it, on the machine that
 * ran it: `/Users/someone/work/app/packages/dom/src/lib/dom/runtime.ts`. All of it before
 * the package name says nothing about the project, and it is most of the line.
 *
 * The full path is kept for opening the file: only what is displayed is shortened.
 */

/** Windows separators, and the leading slash an origin-stripped path can lose. */
const normalize = (file: string): string => file.replace(/\\/g, '/');

/** `Users/…`, `home/…`: an absolute path whose leading slash was trimmed off. */
const ROOTED = /^\/|^(Users|home|var|opt|private|tmp|mnt|srv)\//;

/** Where a monorepo keeps the things it builds. */
const WORKSPACE_DIRS = new Set(['packages', 'apps', 'libs', 'examples']);

/**
 * The part of `file` worth showing.
 *
 * Tried in order: below the project root when the host knows it, then the package a
 * node_modules path names, then the workspace package a monorepo path names. A path that
 * matches none of those is left as it is: guessing at a shorter form would hide which file
 * it is, and the point of the line is to say that.
 */
export function shortenPath(file: string, root?: string): string {
  const path = normalize(file);

  if (root) {
    const base = normalize(root).replace(/\/+$/, '');
    if (base && path.startsWith(`${base}/`)) return path.slice(base.length + 1);
    // The path lost its leading slash on the way here; the root still has one.
    if (base.startsWith('/') && path.startsWith(`${base.slice(1)}/`)) return path.slice(base.length);
  }

  // Everything up to the last node_modules is the machine's, not the project's.
  const installed = path.lastIndexOf('node_modules/');
  if (installed >= 0) return path.slice(installed + 'node_modules/'.length);

  // A monorepo package, which is where a framework's own files sit while it is worked on.
  // The last of these wins: a checkout under `~/Developer/libs` has one in the machine's
  // part of the path as well as the project's, and the project's is the one meant.
  if (ROOTED.test(path)) {
    const segments = path.split('/');
    for (let i = segments.length - 2; i > 0; i--) {
      if (WORKSPACE_DIRS.has(segments[i]!)) return segments.slice(i).join('/');
    }
  }

  return path;
}
