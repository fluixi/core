/**
 * Which build of each package is actually running.
 *
 * This used to live in `@fluixi/core`, stamped only by *its* `render`. But an app can
 * reach the DOM through either entry point: `@fluixi/core`'s `render`, or this package's
 * `render`/`hydrate` by way of `startClient`, and only the first stamped anything. An app
 * that hydrated (the docs site, every SSR app) therefore had no version attributes at all,
 * which is exactly the case where a bug report needs them most.
 *
 * So the stamping sits at the bottom instead, where both paths pass through.
 *
 * The core version cannot be imported here: `@fluixi/core` depends on this package, not
 * the other way round, and reversing that would be a cycle. Core registers its own version
 * on import instead, and whichever render runs stamps whatever has been registered. That
 * keeps the dependency direction intact and still gets all three onto the element.
 */
import { VERSION as DOM } from '../../version.generated.js';
import { VERSION as REACTIVE } from '@fluixi/reactive/version';
import { joinedVersions } from '@fluixi/reactive/signal';

/** The versions of the packages this app is running. */
export interface FluixiVersions {
  /** Absent when the app does not use `@fluixi/core`: dom and reactive can run alone. */
  core?: string;
  dom: string;
  reactive: string;
}

export const versions: FluixiVersions = { dom: DOM, reactive: REACTIVE };

declare global {
  // eslint-disable-next-line no-var
  var Fluixi: FluixiVersions | undefined;
}

/**
 * Record the `@fluixi/core` version, called by core when it is loaded.
 *
 * Inverted rather than imported, because core sits above this package.
 */
export function registerCoreVersion(version: string): void {
  versions.core = version;
}

/** The attribute that marks an element Fluixi mounted, as `ng-version` or `data-v-app` do. */
export const VERSION_ATTRIBUTE = 'data-fluixi';

/**
 * The value of {@link VERSION_ATTRIBUTE}: the release in development, empty in production, so a
 * deployed page says it runs Fluixi without saying which release to look up flaws for. The
 * packages ship as one release, so one version is enough; a skew is warned about on its own.
 */
export function versionMark(): string {
  return isProduction() ? '' : (versions.core ?? versions.dom);
}

export function isProduction(): boolean {
  try {
    // Written out in full: a bundler replaces exactly `process.env.NODE_ENV` in a browser
    // build, where `process` does not exist; a guard or `?.` around it would survive and read
    // as development.
    return process.env.NODE_ENV === 'production';
  } catch {
    // No bundler and no `process`: an unbundled page, treated as development.
    return false;
  }
}

/**
 * Mark the mount element and expose the versions as `window.Fluixi`.
 *
 * The attribute shows in devtools and, written by the server too, in the page source: usually
 * all a bug report contains. The global is what you reach for in a console.
 */
export function stampVersions(container: Element): void {
  container.setAttribute(VERSION_ATTRIBUTE, versionMark());

  if (typeof globalThis === 'undefined') return;
  const current = (globalThis as { Fluixi?: unknown }).Fluixi;
  // A page that loaded a CDN build already has its API there (`window.Fluixi.createSignal`):
  // replacing it broke every later call. The versions go on it instead.
  if (current && typeof current === 'object' && Object.values(current).some((v) => typeof v === 'function')) {
    (current as { versions?: unknown }).versions = versions;
  } else {
    globalThis.Fluixi = versions;
  }
}

/**
 * Warn when the packages are not all from the same release.
 *
 * They are versioned as one unit, so a mismatch means the install is wrong rather than a
 * combination that needs supporting. Worth saying once, loudly, rather than letting it
 * surface later as a reactivity bug nobody can reproduce.
 */
export function warnOnVersionSkew(): void {
  // Two or more builds of @fluixi/reactive sharing one graph. `versions` is module
  // state, so it only ever describes the bundle it was compiled into and cannot see
  // this; the graph itself keeps the list. Standalone web components are how it
  // happens in practice, each carrying its own runtime onto the same page.
  const builds = joinedVersions();
  if (builds.length > 1) {
    console.warn(
      `[fluixi] ${builds.length} builds of @fluixi/reactive are driving one reactive ` +
        `graph: ${builds.join(', ')}. They share it on purpose, so signals still cross ` +
        `between them, but the oldest one decided what the graph looks like. Build the ` +
        `components on one release, or load them as shared-runtime bundles.`,
    );
  }

  const present = [versions.core, versions.dom, versions.reactive].filter(
    (v): v is string => v !== undefined,
  );
  if (new Set(present).size <= 1) return;

  console.warn(
    `[fluixi] package versions disagree: core ${versions.core ?? '(absent)'}, ` +
      `dom ${versions.dom}, reactive ${versions.reactive}. These ship as one release, so a ` +
      `mismatch usually means a stale lockfile or two copies resolved side by side. ` +
      `Reinstall, or check for duplicates with \`pnpm why @fluixi/dom\`.`,
  );
}
