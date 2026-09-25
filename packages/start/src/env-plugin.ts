/**
 * The build half of the declared-public env model.
 *
 * Reads every variable a build has loaded, keeps the ones the app named in `env.public`, and
 * defines them as one frozen literal so `publicEnv()` finds them in the browser. One identifier
 * rather than a per-key replacement, because a per-key define cannot answer a computed lookup
 * and reading env by a computed key is ordinary.
 *
 * The same value is defined for the SSR build, and `publicEnv()` still prefers it there, so both
 * halves of a render see exactly the same set. A server render that could read more than the
 * browser is how a page renders one thing and hydrates into another.
 */
import type { ResolvedConfig } from './config.js';
import { PUBLIC_ENV_DEFINE, selectPublic, suspectPublicNames } from './env.js';

/**
 * Defines the declared-public variables for both builds.
 *
 * A no-op for an app that declares none, which is every app until it opts in: the `VITE_` prefix
 * keeps working and nothing about this changes it.
 */
export function envVitePlugin(cfg: ResolvedConfig): unknown {
  const declared = cfg.env?.public ?? [];

  return {
    name: 'fluixi:env',
    // Before the app's own plugins, so a value defined here is visible to them.
    enforce: 'pre' as const,

    config(_userConfig: unknown, { mode }: { mode: string }) {
      if (!declared.length) return undefined;

      // A name that reads like a secret. The allowlist is the protection, since nothing ships
      // unless it is named; this catches the line written in a hurry.
      const suspect = suspectPublicNames(declared);
      if (suspect.length && process.env.FLUIXI_ALLOW_PUBLIC_SECRETS !== 'true') {
        throw new Error(
          `[fluixi/env] ${suspect.join(', ')} ${suspect.length > 1 ? 'are' : 'is'} listed in \`env.public\`, which puts the value in the browser bundle.\n\n` +
            '  Remove it from the list and read it with `serverEnv()` on the server: middleware, an API route, or a "use server" function.\n' +
            '  If the name only reads like a secret, set FLUIXI_ALLOW_PUBLIC_SECRETS=true.\n',
        );
      }

      return {
        define: {
          // Serialized whole. `JSON.stringify` of the object, so the identifier becomes a
          // literal and a computed lookup against it works.
          [PUBLIC_ENV_DEFINE]: JSON.stringify(publicFor(cfg, mode)),
        },
      };
    },
  };
}

/** Every variable this build can see, narrowed to what the app declared. */
function publicFor(cfg: ResolvedConfig, mode: string): Record<string, string> {
  // `process.env` rather than a second `loadEnv`: the commands call `loadServerEnv` before
  // building, so the files are already merged in and a real OS variable has already won. Reading
  // the files again here would undo that precedence.
  void mode;
  return selectPublic(
    process.env as Record<string, string | undefined>,
    cfg.env?.public ?? [],
  );
}
