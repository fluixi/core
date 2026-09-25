/**
 * How this app proves who it is when it calls an authenticated endpoint.
 *
 * Introspection and revocation authenticate their caller, and a provider decides how. Two
 * ways are in use here and they are exclusive: a shared secret, or a signature from a key
 * whose public half the provider holds. An Okta client set to "Public key / Private key"
 * has no secret to set, so asking for one describes a value that cannot exist.
 *
 * Server side only. Nothing here may be imported from a route that renders.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

/** What a client needs to authenticate itself, in the shape the oauth2 package takes. */
export interface Credentials {
  clientId: string;
  clientSecret?: string;
  privateKey?: Record<string, unknown>;
  keyId?: string;
  clientAuthMethod?: 'client_secret_basic' | 'client_secret_post' | 'private_key_jwt';
  assertionAlgorithm?: string;
}

/**
 * A JWK from a path, with `~` expanded.
 *
 * A signing key is too long to put in a shell variable and does not belong in the
 * repository, so the environment names where it lives and the key stays outside. The same
 * arrangement the conformance suite uses.
 */
function jwkAt(path: string): Record<string, unknown> {
  const file = path.replace(/^~(?=$|\/)/, homedir());
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`the key file ${file} cannot be read`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${file} is not JSON, and a private key is expected as a JWK`);
  }
}

/**
 * The credentials for one provider, or null when none are configured.
 *
 * `<PROVIDER>_INTROSPECT_*` wins over `<PROVIDER>_*`, for a provider that wants a different
 * client to ask than the one that signed the user in.
 */
export function credentialsFor(
  provider: string,
  fallbackClientId: string | undefined,
): Credentials | null {
  const upper = provider.toUpperCase();
  const env = (suffix: string) =>
    process.env[`${upper}_INTROSPECT_${suffix}`] ?? process.env[`${upper}_${suffix}`];

  const clientId = env('CLIENT_ID') ?? fallbackClientId;
  if (!clientId) return null;

  const keyPath = env('PRIVATE_KEY');
  if (keyPath) {
    return {
      clientId,
      privateKey: jwkAt(keyPath),
      keyId: env('KEY_ID'),
      clientAuthMethod: 'private_key_jwt',
      assertionAlgorithm: env('ASSERTION_ALG'),
    };
  }

  const clientSecret = env('SECRET') ?? env('CLIENT_SECRET');
  if (clientSecret) return { clientId, clientSecret };

  return null;
}

/**
 * What to set, for a provider that has neither.
 *
 * Both ways are named because which one applies is a choice made in the provider's console,
 * and a message naming only the secret sends someone looking for a field their client does
 * not have.
 */
export function howToConfigure(provider: string, label: string): string {
  const upper = provider.toUpperCase();
  return (
    `Introspection authenticates its caller, so ${label} needs credentials. ` +
    `For a client with a shared secret, set ${upper}_CLIENT_SECRET. ` +
    `For one registered with a public key (Okta calls this "Public key / Private key"), ` +
    `set ${upper}_PRIVATE_KEY to the path of its private JWK and ${upper}_KEY_ID to the kid ` +
    `the provider lists. Prefix either with ${upper}_INTROSPECT_ to have a different client ask.`
  );
}
