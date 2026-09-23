/**
 * How a client proves who it is to an endpoint that asks.
 *
 * One implementation, used by every call that authenticates: the code exchange, the
 * refresh, the client credentials grant, introspection and revocation. It was four
 * implementations before, which is how `mode: 'server'` ended up unable to use
 * `private_key_jwt` while two other paths could. Adding a method now happens here and
 * reaches all of them.
 *
 * The method names are the ones OIDC uses in `token_endpoint_auth_methods_supported`, so
 * a provider's discovery document and an app's configuration say the same words.
 */
import { OAuthError } from './types.js';

export type ClientAuthMethod =
  /** `Authorization: Basic`, the secret outside the body. The usual default. */
  | 'client_secret_basic'
  /** The secret in the form. Some providers accept only this. */
  | 'client_secret_post'
  /** A short-lived assertion signed with a key the provider knows. No secret travels. */
  | 'private_key_jwt'
  /** A public client: nothing but the id, which PKCE is what protects. */
  | 'none';

/** Shorter spellings, because `basic` and `body` are what an app naturally writes. */
export type ClientAuthMethodInput = ClientAuthMethod | 'basic' | 'body';

const CANONICAL: Record<ClientAuthMethodInput, ClientAuthMethod> = {
  basic: 'client_secret_basic',
  body: 'client_secret_post',
  client_secret_basic: 'client_secret_basic',
  client_secret_post: 'client_secret_post',
  private_key_jwt: 'private_key_jwt',
  none: 'none',
};

export interface ClientAuth {
  clientId: string;
  /**
   * Defaults to `client_secret_basic` when a secret is present and `none` when it is not,
   * which is what each kind of client wants without being told.
   */
  method?: ClientAuthMethodInput;
  clientSecret?: string;
  /** The signing key for `private_key_jwt`, as a JWK. */
  privateKey?: Record<string, unknown>;
  /** Names which key, for a provider holding more than one. Read from the key otherwise. */
  keyId?: string;
  /** Default `RS256`. */
  assertionAlgorithm?: string;
}

/** What the method resolves to, given what the caller supplied. */
export function resolveMethod(auth: ClientAuth): ClientAuthMethod {
  if (auth.method) return CANONICAL[auth.method] ?? 'client_secret_basic';
  if (auth.privateKey) return 'private_key_jwt';
  return auth.clientSecret ? 'client_secret_basic' : 'none';
}

/**
 * Check a configuration before anything tries to use it.
 *
 * Separate from applying it so a constructor can refuse early, naming what is missing,
 * rather than failing on the first request with a provider's word for it.
 */
export function assertUsable(auth: ClientAuth, who: string): ClientAuthMethod {
  if (!auth.clientId) throw new Error(`[fluixi/oauth2] ${who} needs a clientId.`);

  const method = resolveMethod(auth);
  if (method === 'private_key_jwt' && !auth.privateKey) {
    throw new Error(
      `[fluixi/oauth2] ${who}: private_key_jwt needs \`privateKey\`, the JWK whose public half the provider holds.`,
    );
  }
  if (
    (method === 'client_secret_basic' || method === 'client_secret_post') &&
    !auth.clientSecret
  ) {
    throw new Error(
      `[fluixi/oauth2] ${who}: ${method} needs a \`clientSecret\`. A public client should use \`method: 'none'\`, which PKCE is what protects.`,
    );
  }
  return method;
}

/** `jose`, loaded only when an assertion actually has to be signed. */
async function loadJose(): Promise<typeof import('jose')> {
  try {
    return await import('jose');
  } catch {
    throw new OAuthError(
      'private_key_jwt needs `jose`. Install it: npm i jose. It is an optional peer, so a client using a secret does not carry it.',
      'jose_missing',
    );
  }
}

/**
 * An assertion, per RFC 7523.
 *
 * `aud` is the endpoint being called, so it cannot be presented at a different one.
 * `jti` is fresh, so it cannot be presented twice at the same one. A minute of life makes
 * a captured one worth almost nothing.
 */
async function signAssertion(auth: ClientAuth, endpoint: string): Promise<string> {
  const jose = await loadJose();
  const alg = auth.assertionAlgorithm ?? 'RS256';
  const key = await jose.importJWK(auth.privateKey as never, alg);
  const kid = auth.keyId ?? (auth.privateKey!.kid as string | undefined);

  return new jose.SignJWT({})
    .setProtectedHeader(kid ? { alg, kid } : { alg })
    .setIssuer(auth.clientId)
    .setSubject(auth.clientId)
    .setAudience(endpoint)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime('1m')
    .sign(key);
}

/**
 * Put the client's credentials on a request to `endpoint`.
 *
 * Mutates `headers` and `form` rather than returning a new pair, because every caller
 * already has both and is about to send them.
 */
export async function applyClientAuth(
  auth: ClientAuth,
  endpoint: string,
  headers: Record<string, string>,
  form: URLSearchParams,
): Promise<void> {
  switch (resolveMethod(auth)) {
    case 'client_secret_basic': {
      // Form-encoded before base64, which is what the spec asks for and what a secret
      // containing a colon or a space depends on.
      const pair = `${encodeURIComponent(auth.clientId)}:${encodeURIComponent(auth.clientSecret!)}`;
      headers.authorization = `Basic ${btoa(pair)}`;
      // Deliberately not also in the form: sending it twice is how a provider that reads
      // the body first ends up ignoring the header.
      break;
    }

    case 'client_secret_post':
      form.set('client_id', auth.clientId);
      form.set('client_secret', auth.clientSecret!);
      break;

    case 'private_key_jwt':
      form.set('client_id', auth.clientId);
      form.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      form.set('client_assertion', await signAssertion(auth, endpoint));
      break;

    case 'none':
      // A public client names itself and proves nothing, which is the whole reason the
      // authorization code flow needs PKCE.
      form.set('client_id', auth.clientId);
      break;
  }
}
