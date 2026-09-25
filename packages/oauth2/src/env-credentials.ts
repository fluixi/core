/**
 * Working out how a client proves who it is, from the environment.
 *
 * Introspection and revocation authenticate their caller and the provider decides how. Two
 * ways are in use and they are exclusive: a shared secret, or a signature from a key whose
 * public half the provider holds. Which one applies is a choice made in the provider's
 * console, so code that assumes a secret describes a field that, for an Okta client set to
 * "Public key / Private key", does not exist.
 *
 * Server side. A signing key and a client secret are both things a page must never see, so
 * nothing here may be reached from a browser bundle. The file read is loaded on demand so
 * importing this module does not require node.
 */
import type { ClientAuthMethod } from './client-auth.js';

/** What a client needs to authenticate itself, shaped for the options these take. */
export interface EnvCredentials {
  clientId: string;
  clientSecret?: string;
  privateKey?: Record<string, unknown>;
  keyId?: string;
  clientAuthMethod?: ClientAuthMethod;
  assertionAlgorithm?: string;
}

export interface EnvCredentialsOptions {
  /**
   * Prefix for the variable names, upper-cased. `okta` reads `OKTA_CLIENT_SECRET` and the
   * rest.
   */
  prefix: string;
  /** Used when no `<PREFIX>_CLIENT_ID` is set, usually the client the app signs people in with. */
  clientId?: string;
  /**
   * A second prefix tried first, for a provider that wants a different client to ask than
   * the one that signed the user in. Okta needs this: a public SPA cannot introspect, so an
   * API Services client does it.
   *
   * Defaults to `<PREFIX>_INTROSPECT`.
   */
  preferPrefix?: string;
  /** Where to read variables from. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
}

/** Reads a JWK from a path, with `~` expanded. Node only, and only when a key is named. */
async function jwkAt(path: string): Promise<Record<string, unknown>> {
  const [{ readFileSync }, { homedir }] = await Promise.all([
    import('node:fs'),
    import('node:os'),
  ]);
  const file = path.replace(/^~(?=$|\/)/, homedir());

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    throw new Error(
      `[fluixi/oauth2] the key file ${file} cannot be read. A signing key is named by path so it can stay outside the repository.`,
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`[fluixi/oauth2] ${file} is not JSON, and a private key is expected as a JWK.`);
  }
}

/**
 * Credentials for one provider, or null when none are configured.
 *
 * A named key that cannot be read throws rather than returning null: that is a mistake in
 * the configuration, not an absence of it, and the two need different answers.
 *
 * @example
 * ```ts
 * const credentials = await credentialsFromEnv({ prefix: 'okta', clientId: config.clientId });
 * if (!credentials) return Response.json({ error: explainCredentials({ prefix: 'okta' }) }, { status: 501 });
 *
 * const introspect = createTokenIntrospector({ issuer, ...credentials, audience: false });
 * ```
 */
export async function credentialsFromEnv(
  options: EnvCredentialsOptions,
): Promise<EnvCredentials | null> {
  const source = options.env ?? (typeof process === 'undefined' ? {} : process.env);
  const upper = options.prefix.toUpperCase();
  const prefer = (options.preferPrefix ?? `${upper}_INTROSPECT`).toUpperCase();

  const read = (suffix: string) => source[`${prefer}_${suffix}`] ?? source[`${upper}_${suffix}`];

  const clientId = read('CLIENT_ID') ?? options.clientId;
  if (!clientId) return null;

  // A key wins over a secret. A client configured both ways at the provider is unusual, and
  // the key is the stronger of the two.
  const keyPath = read('PRIVATE_KEY');
  if (keyPath) {
    return {
      clientId,
      privateKey: await jwkAt(keyPath),
      keyId: read('KEY_ID'),
      clientAuthMethod: 'private_key_jwt',
      assertionAlgorithm: read('ASSERTION_ALG'),
    };
  }

  const clientSecret = read('SECRET') ?? read('CLIENT_SECRET');
  if (clientSecret) return { clientId, clientSecret };

  return null;
}

/**
 * What to set, when nothing is.
 *
 * Names both ways, because a message naming only the secret sends someone hunting for a
 * field their client does not have.
 */
export function explainCredentials(options: { prefix: string; label?: string }): string {
  const upper = options.prefix.toUpperCase();
  const who = options.label ?? options.prefix;
  return (
    `This call authenticates its caller, so ${who} needs credentials. ` +
    `For a client with a shared secret, set ${upper}_CLIENT_SECRET. ` +
    `For one registered with a public key (Okta calls this "Public key / Private key"), set ` +
    `${upper}_PRIVATE_KEY to the path of its private JWK and ${upper}_KEY_ID to the kid the ` +
    `provider lists. Prefix either with ${upper}_INTROSPECT_ to have a different client ask, ` +
    `which Okta requires: a public SPA cannot introspect at all.`
  );
}
