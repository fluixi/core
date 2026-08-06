/**
 * Which build of each package is actually running.
 *
 * Two reasons this exists rather than a single `fluixi-js="v1"` stamp:
 *
 *  - **A bug report needs the real versions.** "v1" says nothing; `1.0.0-alpha.68` says
 *    exactly which build to check out.
 *  - **The packages can disagree.** `@fluixi/core`, `@fluixi/dom` and `@fluixi/reactive`
 *    version together but are resolved separately, so a stale lockfile or a mixed install
 *    can pair one version of the DOM runtime with another of the signal core. That is the
 *    kind of fault that shows up as inexplicable reactivity behaviour, and the DOM now
 *    says so out loud.
 *
 * Read from generated constants rather than `package.json`: bundlers and ESM resolvers
 * treat a manifest import inconsistently, and it would pull the whole file into the
 * bundle for one string.
 */
import { VERSION as CORE } from '../../version.generated.js';
import { VERSION as DOM } from '@fluixi/dom';
import { VERSION as REACTIVE } from '@fluixi/reactive';

/** The versions of the packages this app is running. */
export interface FluixiVersions {
  core: string;
  dom: string;
  reactive: string;
}

export const versions: FluixiVersions = { core: CORE, dom: DOM, reactive: REACTIVE };

declare global {
  // eslint-disable-next-line no-var
  var Fluixi: FluixiVersions | undefined;
}

/**
 * Stamp the versions onto the mount element and expose them as `window.Fluixi`.
 *
 * The attributes make it visible in the page source and in a screenshot of devtools —
 * which is usually all a bug report contains — while the global is what you reach for in
 * a console.
 */
export function stampVersions(container: Element): void {
  container.setAttribute('fluixi', versions.core);
  container.setAttribute('fx-dom', versions.dom);
  container.setAttribute('fx-reactive', versions.reactive);

  if (typeof globalThis !== 'undefined') globalThis.Fluixi = versions;
}

/**
 * Warn when the three packages are not from the same release.
 *
 * They are versioned as one unit, so a mismatch means the install is wrong, not that a
 * combination needs supporting. Worth saying once, loudly, rather than letting it surface
 * later as a reactivity bug nobody can reproduce.
 */
export function warnOnVersionSkew(): void {
  const distinct = new Set(Object.values(versions));
  if (distinct.size <= 1) return;
  console.warn(
    `[fluixi] package versions disagree — core ${versions.core}, dom ${versions.dom}, ` +
      `reactive ${versions.reactive}. These ship as one release, so a mismatch usually ` +
      `means a stale lockfile or two copies resolved side by side. Reinstall, or check ` +
      `for duplicates with \`pnpm why @fluixi/dom\`.`,
  );
}
