// Where the application asked for a node that something else created.
//
// The compiler marks creation sites in the code it compiles, which is the project's own. A
// node the framework makes on the application's behalf, the locale signal behind `locale()`,
// the router's revalidation counter: is created inside a package, so it carries either the
// package's line or nothing at all, and neither says which line of the application led to it.
//
// The observer is called synchronously from inside the creating call, so the stack at that
// moment still has the application's frame in it. Reading it costs nothing until it is asked
// for, which is only for a node the compiler did not mark.
import type { ReactiveSourceLocation } from './source.js';

/**
 * A browser extension's own bundle.
 *
 * The devtools agent carries a copy of this package, so every frame inside it looked like
 * application code and every node reported `chrome-extension://…/agent.js` as its origin.
 * Nothing under these schemes is ever the page's own source.
 */
const EXTENSION = ['chrome-extension://', 'moz-extension://', 'safari-web-extension://', 'extension://'];

/** Frames that are the machinery rather than the caller. */
const INTERNAL = [
  '/packages/reactive/',
  '/packages/dom/',
  '/packages/core/',
  '/packages/devtools/',
  '/packages/web-components/',
  '/packages/auth/',
  '/packages/oauth2/',
  '/packages/session/',
  '/packages/router/',
  '/packages/head/',
  '/packages/start/',
  '/packages/server/',
  '/packages/template-runtime/',
  '/@fluixi/',
  'node_modules',
  'fluixi-devtools',
  ...EXTENSION,
];

/** The plumbing that reports a node, which is never worth naming as its origin. */
const REPORTING = [
  '/packages/reactive/src/lib/signal/graph/',
  '/packages/devtools/',
  'fluixi-devtools',
  // Not a fallback either: naming the agent as where a node came from is worse than nothing.
  ...EXTENSION,
];

/** `at name (url:line:col)` and `at url:line:col`, which is the whole of what is needed. */
const FRAME = /(?:at\s+(?:[^(]*\()?)([^()\s]+):(\d+):(\d+)\)?$/;

const isInternal = (frame: string): boolean => INTERNAL.some((part) => frame.includes(part));

/**
 * The first frame that is not the framework's own.
 *
 * `origin` trims a dev server's url back to a project path, so a location reads
 * `src/App.tsx:6` rather than `http://localhost:5173/src/App.tsx?t=1712`.
 */
function locate(frame: string, origin?: string): ReactiveSourceLocation | undefined {
  const match = FRAME.exec(frame);
  if (!match) return undefined;
  let file = match[1]!;
  // A dev server serves a project file at its own origin, with a cache-busting query.
  if (origin && file.startsWith(origin)) file = file.slice(origin.length);
  file = file.replace(/^\/@fs\//, '/').replace(/\?.*$/, '').replace(/^\//, '');
  return file ? { file, line: Number(match[2]), column: Number(match[3]) } : undefined;
}

/**
 * Where a node came from, and whether that is the application or something it depends on.
 *
 * The application's own frame is the useful one, but a node made while a package was loading
 * has no application frame above it at all: a router's revalidation counter, made when its
 * module is evaluated. Falling back to the package's own frame is what stops that node being
 * a card with no name, no origin and no explanation.
 */
export function callSite(
  stack: string | undefined,
  origin?: string,
): { location: ReactiveSourceLocation; external: boolean } | undefined {
  if (!stack) return undefined;
  let fallback: ReactiveSourceLocation | undefined;

  for (const line of stack.split('\n')) {
    const frame = line.trim();
    if (!frame.startsWith('at ')) continue;
    if (!isInternal(frame)) {
      const location = locate(frame, origin);
      if (location) return { location, external: false };
      continue;
    }
    // The first frame that is a package rather than the reporting machinery itself.
    if (!fallback && !REPORTING.some((part) => frame.includes(part))) fallback = locate(frame, origin);
  }
  return fallback ? { location: { ...fallback, external: true }, external: true } : undefined;
}

/**
 * The call site of whatever is being created right now. Called from inside the observer, so
 * the frames of the creating call are still on the stack.
 */
export function currentCallSite(
  origin?: string,
): { location: ReactiveSourceLocation; external: boolean } | undefined {
  return callSite(new Error().stack, origin);
}
