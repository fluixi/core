/**
 * Environment variables, with what reaches the browser declared rather than spelled.
 *
 * Vite's rule is that a `VITE_` prefix makes a value public. It works, and it has two costs.
 * The prefix does two jobs in one name, so moving a value between server and browser means
 * renaming every reference to it; and a mistake is silent, because naming a secret
 * `VITE_API_SECRET` publishes it whether any code reads it or not. Guarding that meant a word
 * list, and a word list is guesswork: `TOKEN` had to be left out of it because
 * `VITE_TOKEN_ENDPOINT` is an ordinary URL.
 *
 * So an app declares the public set instead:
 *
 * ```ts
 * // fluixi.config.ts
 * env: { public: ['AUTH_ISSUER', 'AUTH_CLIENT_ID', 'API_URL'] }
 * ```
 *
 * Everything not named there is server-only by omission. A secret cannot ship by being called
 * the wrong thing, only by being listed, which is a line someone has to write on purpose.
 *
 * ## One accessor, both sides
 *
 * `publicEnv()` works in a browser and on a server, and that is the other half of the point.
 * `import.meta.env` does not: Vite replaces it where it processes the source, so it is fine in
 * app code and fine in a bundled dependency, and `undefined` in an SSR build where the
 * dependency is externalized and node loads it directly. That failure appears only in
 * production, and only once an app stops bundling the package. `publicEnv()` reads a value the
 * plugin defined in the client build and `process.env` on a server, so the same call is correct
 * in both places.
 *
 * `VITE_` keeps working. This is additive.
 */

/**
 * What the plugin defines into the client bundle.
 *
 * A single identifier rather than a per-key replacement, so a dynamic read works: `publicEnv()`
 * hands back an object, and code is free to index it with a computed key.
 */
declare const __FLUIXI_PUBLIC_ENV__: Record<string, string> | undefined;

/** The name the plugin defines, exported so the plugin and this module cannot disagree. */
export const PUBLIC_ENV_DEFINE = '__FLUIXI_PUBLIC_ENV__';

/** Whether this is running where a bundle would be. */
const inBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

let warned = false;

/**
 * The variables this app declared public.
 *
 * Frozen, because it describes a build rather than a mutable state. Safe to call anywhere: in a
 * component, a loader, middleware, an API route, a `"use server"` function.
 *
 * @example
 * ```ts
 * import { publicEnv } from '@fluixi/start/env';
 * import { authFromEnv } from '@fluixi/oauth2/env';
 *
 * export const auth = authFromEnv(publicEnv());
 * ```
 */
export function publicEnv(): Readonly<Record<string, string>> {
  // The defined literal first, which is what exists in a client bundle. `typeof` rather than a
  // bare reference: an undeclared identifier is a ReferenceError, not undefined.
  const defined = typeof __FLUIXI_PUBLIC_ENV__ === 'undefined' ? undefined : __FLUIXI_PUBLIC_ENV__;
  if (defined) return Object.freeze({ ...defined });

  if (typeof process !== 'undefined' && process.env) {
    // A server, or a test. `declaredPublicKeys` is set by the plugin during a build; without it
    // every variable is returned, which is correct on a server and impossible in a browser.
    const keys = declaredPublicKeys;
    const source = process.env as Record<string, string | undefined>;
    const out: Record<string, string> = {};
    for (const key of keys ?? Object.keys(source)) {
      const value = source[key];
      if (value !== undefined) out[key] = value;
    }
    return Object.freeze(out);
  }

  if (inBrowser() && !warned) {
    warned = true;
    // Reachable when a page is served by something other than a fluixi build.
    console.warn(
      '[fluixi/env] publicEnv() found nothing defined. The fluixi vite plugin defines it during a build, so this is a page built another way.',
    );
  }
  return Object.freeze({});
}

/**
 * The keys an app declared public, when a build told us.
 *
 * Server side this narrows `publicEnv()` to the same set the browser gets, so a value that
 * only works on the server cannot be read through the public accessor in a loader and then be
 * missing in the browser: the two would disagree and only the browser would break.
 */
let declaredPublicKeys: string[] | null = null;

/** Called by the plugin. Not part of the app-facing surface. */
export function setDeclaredPublicKeys(keys: readonly string[] | null): void {
  declaredPublicKeys = keys ? [...keys] : null;
}

/**
 * A server-only variable.
 *
 * Throws in a browser rather than returning undefined. A secret read as undefined turns into a
 * request sent without credentials, which fails somewhere else entirely, and the stack points
 * at the request instead of at the read.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { serverEnv } from '@fluixi/start/env';
 * const secret = serverEnv('OIDC_CLIENT_SECRET', { required: true });
 * ```
 */
export function serverEnv(name: string, options?: { required?: false }): string | undefined;
export function serverEnv(name: string, options: { required: true }): string;
export function serverEnv(
  name: string,
  options: { required?: boolean } = {},
): string | undefined {
  if (inBrowser()) {
    throw new Error(
      `[fluixi/env] serverEnv(${JSON.stringify(name)}) was called in a browser. ` +
        'Server-only values are not in the bundle, so this can only ever be undefined here. ' +
        'Read it in middleware, an API route, or a "use server" function, and pass what the page needs. ' +
        `If ${name} is genuinely public, add it to \`env.public\` in fluixi.config.ts and use publicEnv().`,
    );
  }

  const value = typeof process === 'undefined' ? undefined : process.env?.[name];
  if (options.required && (value === undefined || value === '')) {
    throw new Error(
      `[fluixi/env] ${name} is not set. It is server-only, so it belongs in .env without a client prefix, or in the deployment's own secrets.`,
    );
  }
  return value === '' ? undefined : value;
}

/**
 * Pick the public subset out of every variable a build loaded.
 *
 * Used by the plugin. Exported because the rule for what a key means belongs next to the
 * accessor that reads it, not in the plugin: a prefixed name is taken as its unprefixed self,
 * so an app migrating from `VITE_AUTH_ISSUER` can list `AUTH_ISSUER` and have both work.
 */
export function selectPublic(
  all: Record<string, string | undefined>,
  declared: readonly string[],
  options: { clientPrefix?: string } = {},
): Record<string, string> {
  const prefix = options.clientPrefix ?? 'VITE_';
  const out: Record<string, string> = {};

  for (const key of declared) {
    // The bare name wins; the prefixed spelling is accepted so a migration is not all-or-nothing.
    const value = all[key] ?? all[`${prefix}${key}`];
    if (value !== undefined && value !== '') out[key] = value;
  }

  // Everything already prefixed stays public, because it always was. Removing it here would
  // break an app mid-migration, and it is published in the bundle regardless.
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(prefix) && value !== undefined && value !== '') out[key] = value;
  }

  return out;
}

/**
 * Names in the public set that look like secrets.
 *
 * The allowlist is the real protection: nothing ships unless it is named. This is the second
 * look, for a line written in a hurry. Same words as the build guard, and deliberately short.
 */
export function suspectPublicNames(declared: readonly string[]): string[] {
  return declared.filter((name) =>
    /(SECRET|PASSWORD|PASSWD|PRIVATE_KEY|CLIENT_SECRET|CREDENTIALS?)($|_)/.test(name),
  );
}
