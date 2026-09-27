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
declare const __FLUIXI_PUBLIC_KEYS__: string[] | undefined;

/** The name the plugin defines, exported so the plugin and this module cannot disagree. */
export const PUBLIC_ENV_DEFINE = '__FLUIXI_PUBLIC_ENV__';
/** The declared names, set or not: what `env()` in a browser checks a name against. */
export const PUBLIC_KEYS_DEFINE = '__FLUIXI_PUBLIC_KEYS__';

/** Whether this is running where a bundle would be. */
const inBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

let warned = false;

/**
 * The keys an app declared in `env.public`.
 *
 * Empty in the package. `@fluixi/start` writes the app's own list into
 * `src/fluixi-public-env.d.ts`, which fills this in, so `publicEnv().` completes the declared
 * names and an undeclared one is a type error as well as a build error.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PublicEnv {}

/**
 * What `publicEnv()` returns: each declared key as an optional string, since a declared variable
 * can still be unset, plus any `VITE_` name, which is public by its prefix. An app that has not
 * declared any gets the plain record it always had.
 */
export type PublicEnvValues = keyof PublicEnv extends never
  ? Readonly<Record<string, string>>
  : Readonly<{ [K in keyof PublicEnv]?: string } & { [K in `VITE_${string}`]?: string }>;

function readPublicEnv(): Readonly<Record<string, string>> {
  // The defined literal first, which is what exists in a client bundle. `typeof` rather than a
  // bare reference: an undeclared identifier is a ReferenceError, not undefined.
  const defined = typeof __FLUIXI_PUBLIC_ENV__ === 'undefined' ? undefined : __FLUIXI_PUBLIC_ENV__;
  if (defined) return Object.freeze({ ...defined });

  if (typeof process !== 'undefined' && process.env) {
    // A server, or a test. The defined literal never reaches a server that imports this package
    // from node_modules rather than bundling it, which is the default for a published install,
    // so this path has to answer the same way `selectPublic` did at build time: a declared name
    // is found under its bare or its `VITE_` spelling. Without the declared list (set by the
    // plugin during a build) every variable is returned, which is correct on a server and
    // impossible in a browser, with the bare name added for each prefixed one.
    const source = process.env as Record<string, string | undefined>;
    const keys = declaredPublicKeys ?? bareNames(source);
    return Object.freeze(selectPublic(source, keys));
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
export function publicEnv(): PublicEnvValues {
  return readPublicEnv() as PublicEnvValues;
}

/**
 * Server variable names found in the app's `.env` files, filled in by the same generated file
 * as `PublicEnv`. Names only, never values: they complete `env('…')` in the editor.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerEnv {}

type KnownEnvKey = keyof PublicEnv | keyof ServerEnv;

/** A name `env()` accepts: any known one plus `VITE_*`, or any string until some are known. */
export type EnvKey = [KnownEnvKey] extends [never] ? string : KnownEnvKey | `VITE_${string}`;

/**
 * One environment variable, public or server-only, from wherever the code runs.
 *
 * On the server it reads any variable. In the browser only the public set exists, so a name
 * that `env.public` does not declare throws, naming it: the build refuses it where the name is
 * written, and this catches a key the build could not see, such as one computed at run time.
 * `publicEnv()` and `serverEnv()` remain for code that wants to say which side it means.
 *
 * `$env('KEY')` compiles to this without an import.
 *
 * @example
 * ```ts
 * const api = env('API_URL');                                // string | undefined
 * const secret = env('SESSION_SECRET', { required: true });  // string, server only
 * ```
 */
export function env(key: EnvKey, options?: { required?: false }): string | undefined;
export function env(key: EnvKey, options: { required: true }): string;
export function env(key: string, options: { required?: boolean } = {}): string | undefined {
  let value: string | undefined;
  if (inBrowser()) {
    const declared = typeof __FLUIXI_PUBLIC_KEYS__ === 'undefined' ? undefined : __FLUIXI_PUBLIC_KEYS__;
    if (declared && !declared.includes(key) && !key.startsWith('VITE_')) {
      throw new Error(
        `[fluixi/env] env(${JSON.stringify(key)}) ran in the browser, where only env.public exists. ` +
          `If ${key} is public, add it to env.public in fluixi.config.ts. If it is a secret, read it on the ` +
          'server (middleware, an API route, a "use server" function) and pass the page what it needs.',
      );
    }
    value = (readPublicEnv() as Record<string, string | undefined>)[key];
  } else {
    // The bare name, then its `VITE_` spelling: the same rule `publicEnv()` applies, so a `.env`
    // still mid-migration reads the same through either.
    const source = typeof process === 'undefined' ? undefined : process.env;
    value = source?.[key] || (key.startsWith('VITE_') ? undefined : source?.[`VITE_${key}`]);
  }
  if (value === '') value = undefined;
  if (options.required && value === undefined) {
    throw new Error(`[fluixi/env] ${key} is not set.`);
  }
  return value;
}

/** How `pickEnv` reads one field: a bare key is a required string. */
export type EnvField =
  | EnvKey
  | {
      key: EnvKey;
      /** Unset reads as `undefined` instead of being reported missing. */
      optional?: boolean;
      /** Used when unset. Also makes the field never `undefined`. */
      default?: unknown;
      /** Turns the raw string into the field's value. Throwing marks the value invalid. */
      parse?: (raw: string) => unknown;
    };

type FieldValue<F> = F extends string
  ? string
  : F extends { parse: (raw: string) => infer R }
    ? F extends { default: infer D }
      ? R | D
      : F extends { optional: true }
        ? R | undefined
        : R
    : F extends { default: infer D }
      ? string | D
      : F extends { optional: true }
        ? string | undefined
        : string;

/** The object `pickEnv` returns for a given spec. */
export type PickedEnv<S extends Record<string, EnvField>> = { readonly [K in keyof S]: FieldValue<S[K]> };

/**
 * Build a config object from environment variables in one declaration.
 *
 * Every field is read through `env()`, so the same rules hold on both sides, and the browser build
 * checks the keys like any other read. Every missing or invalid variable is reported in one
 * error rather than the first alone, which is what a fresh checkout or a new deployment needs.
 * The result is frozen: it describes the deployment, not state.
 *
 * @example
 * ```ts
 * export const config = pickEnv({
 *   apiUrl: 'API_URL',
 *   authServiceUrl: { key: 'AUTH_SERVICE_URL', default: '' },
 *   pageSize: { key: 'PAGE_SIZE', default: 20, parse: asNumber },
 * });
 * ```
 */
export function pickEnv<const S extends Record<string, EnvField>>(spec: S): PickedEnv<S> {
  const out: Record<string, unknown> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [field, entry] of Object.entries(spec)) {
    const def = typeof entry === 'string' ? { key: entry } : entry;
    const raw = env(def.key);
    if (raw === undefined) {
      if ('default' in def) out[field] = def.default;
      else if (def.optional) out[field] = undefined;
      else missing.push(def.key);
      continue;
    }
    try {
      out[field] = def.parse ? def.parse(raw) : raw;
    } catch (cause) {
      invalid.push(`${def.key} (${cause instanceof Error ? cause.message : String(cause)})`);
    }
  }

  if (missing.length || invalid.length) {
    const lines = [
      missing.length ? `  not set: ${missing.join(', ')}` : '',
      invalid.length ? `  invalid: ${invalid.join('; ')}` : '',
    ].filter(Boolean);
    throw new Error(`[fluixi/env] The environment is incomplete:\n${lines.join('\n')}`);
  }
  return Object.freeze(out) as PickedEnv<S>;
}

/** A number, refusing anything that does not read as one. */
export function asNumber(raw: string): number {
  const n = Number(raw.trim());
  if (raw.trim() === '' || Number.isNaN(n)) throw new Error(`"${raw}" is not a number`);
  return n;
}

/** `true`, `1`, `yes`, `on` and their opposites, any case. Anything else is refused. */
export function asBoolean(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  throw new Error(`"${raw}" is not a boolean`);
}

/** A list separated by commas or spaces, empty entries dropped. */
export function asList(raw: string): string[] {
  return raw.split(/[\s,]+/).filter(Boolean);
}

/** An absolute URL, without a trailing slash so a path can be appended. */
export function asUrl(raw: string): string {
  try {
    return new URL(raw.trim()).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`"${raw}" is not an absolute URL`);
  }
}

/** Every name in `source`, plus the bare form of each `VITE_` one. */
function bareNames(source: Record<string, string | undefined>): string[] {
  const names = new Set(Object.keys(source));
  for (const key of names) if (key.startsWith('VITE_')) names.add(key.slice('VITE_'.length));
  return [...names];
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
