/**
 * Which build of each package is actually running.
 *
 * This used to live in `@fluixi/core`, stamped only by *its* `render`. But an app can
 * reach the DOM through either entry point — `@fluixi/core`'s `render`, or this package's
 * `render`/`hydrate` by way of `startClient` — and only the first stamped anything. An app
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
  /** Absent when the app does not use `@fluixi/core` — dom and reactive can run alone. */
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

/**
 * Stamp the versions onto the mount element and expose them as `window.Fluixi`.
 *
 * The attributes make it visible in the page source and in a screenshot of devtools —
 * usually all a bug report contains — while the global is what you reach for in a console.
 */
export function stampVersions(container: Element): void {
  if (versions.core) container.setAttribute('fluixi', versions.core);
  container.setAttribute('fx-dom', versions.dom);
  container.setAttribute('fx-reactive', versions.reactive);

  if (typeof globalThis !== 'undefined') globalThis.Fluixi = versions;
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
    `[fluixi] package versions disagree — core ${versions.core ?? '(absent)'}, ` +
      `dom ${versions.dom}, reactive ${versions.reactive}. These ship as one release, so a ` +
      `mismatch usually means a stale lockfile or two copies resolved side by side. ` +
      `Reinstall, or check for duplicates with \`pnpm why @fluixi/dom\`.`,
  );
}
