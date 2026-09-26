/**
 * Auth configuration from environment variables, with names the framework agrees on.
 *
 * Two surfaces with opposite rules, and mixing them is how a secret ships:
 *
 *  - the **client** half is public by nature. An issuer, a client id, where the tokens live, a redirect URI:
 *    all of it reaches the browser whatever you do, because a public client sends them to the
 *    provider in a URL. Prefixed `VITE_`, which is what makes Vite inline them.
 *  - the **server** half is a client secret, a signing key, a cookie secret. Never prefixed.
 *    `credentialsFromEnv` reads those, and `@fluixi/start`'s env guard fails a build that
 *    names one `VITE_`.
 *
 * This module is the client half. It takes the record rather than reading `import.meta.env`
 * itself, and that is deliberate. Vite replaces `import.meta.env` where it processes the
 * source, so writing it in app code is reliable in a way that a published package reading it
 * is not. The cost is one word at the call site:
 *
 * ```ts
 * export const auth = authFromEnv(import.meta.env);
 * ```
 *
 * The same function then works against `process.env`, a worker binding, Deno, or a fixture in
 * a test, none of which involve a bundler at all.
 */
import { presets, type PresetName, type ProviderPreset } from './presets.js';
import type { TokenClaims } from './verify.js';

/** Names that mean a secret, which must never arrive through a client-prefixed variable. */
const SECRETISH = /(SECRET|PASSWORD|PRIVATE_KEY|CREDENTIALS?)($|_)/;

export interface AuthEnvOptions {
  /**
   * Prefix for the variable names, after the client prefix. Default `AUTH`.
   *
   * `VITE_AUTH_ISSUER`, `VITE_AUTH_CLIENT_ID`, and so on. Pass a provider name for an app
   * offering several: `prefix: 'OKTA'` reads `VITE_OKTA_ISSUER`, falling back to
   * `VITE_AUTH_ISSUER` for anything it does not set.
   */
  prefix?: string;
  /**
   * The client prefix. Default `VITE_`, which is Vite's.
   *
   * Pass `''` when reading `process.env` on a server, where nothing is prefixed.
   */
  clientPrefix?: string;
  /** Overrides `<PREFIX>_PROVIDER`, for an app that knows which provider it is. */
  provider?: PresetName;
  /** Overrides `<PREFIX>_TOKENS`. */
  tokens?: 'browser' | 'server';
  /** Where this provider puts roles, when the preset's default is not right. */
  roles?: (claims: TokenClaims) => string[];
}

/** What the environment said, assembled. */
export interface AuthEnv {
  /** The preset, built from whichever variables were present. */
  provider: ProviderPreset;
  /** Which preset was chosen, for a message or a log. */
  providerName: PresetName;
  clientId: string;
  /** Where the tokens live. `browser` unless told otherwise. */
  tokens: 'browser' | 'server';
  /** The redirect URI, or undefined when the app builds it from its own base URL. */
  redirectUri?: string;
  /** Scopes, when the environment overrode the preset's. */
  scopes?: string[];
  /** Everything needed by `createBrowserClient`, ready to spread. */
  client: ProviderPreset['client'] & {
    clientId: string;
    tokens: 'browser' | 'server';
    redirectUri?: string;
  };
}

/** Splits a scope list written with spaces or commas. */
const scopeList = (value: string | undefined): string[] | undefined =>
  value ? value.split(/[\s,]+/).filter(Boolean) : undefined;

/** `true`, `1` and `on` all mean yes. Anything else present means no. */
const flag = (value: string | undefined): boolean | undefined =>
  value === undefined ? undefined : /^(true|1|on|yes)$/i.test(value.trim());

/**
 * Read auth configuration from an environment record.
 *
 * Variables, with `VITE_AUTH` as the default prefix. Everything is optional except an issuer
 * (or the provider-specific field that builds one) and a client id.
 *
 * | variable | meaning |
 * | --- | --- |
 * | `_PROVIDER` | `oidc` (default), `keycloak`, `auth0`, `okta`, `google`, `dex`, `oauth2` |
 * | `_ISSUER` | the issuer, for `oidc` and `oauth2` |
 * | `_CLIENT_ID` | this client |
 * | `_TOKENS` | `browser` (default) or `server` |
 * | `_REDIRECT_URI` | where the provider sends the browser back |
 * | `_SCOPES` | space or comma separated, overriding the preset's |
 * | `_AUDIENCE` | an API identifier. Auth0 needs it for a JWT access token |
 * | `_DPOP` | `true` or `false`, overriding the preset |
 * | `_DOMAIN` | the tenant, for `auth0` and `okta` |
 * | `_BASE_URL` | for `keycloak` and `dex` |
 * | `_REALM` | for `keycloak` |
 * | `_AUTH_SERVER` | for `okta`, default `default`, `org` for the org server |
 * | `_ROLES_CLAIM` | the namespaced claim an Auth0 action adds |
 *
 * @example
 * ```ts
 * // src/config/auth.ts
 * import { authFromEnv } from '@fluixi/oauth2/env';
 * export const auth = authFromEnv(import.meta.env);
 *
 * // src/services/auth/auth.ts
 * const client = createBrowserClient({ ...auth.client, redirectUri: `${env.appUrl}/callback` });
 * const verify = createTokenVerifier(auth.provider.verifier(auth.clientId));
 * ```
 */
export function authFromEnv(
  source: Record<string, string | undefined>,
  options: AuthEnvOptions = {},
): AuthEnv {
  const clientPrefix = options.clientPrefix ?? 'VITE_';
  const specific = `${clientPrefix}${(options.prefix ?? 'AUTH').toUpperCase()}`;
  const general = `${clientPrefix}AUTH`;

  /** The specific prefix wins, so one app can carry several providers. */
  const read = (suffix: string): string | undefined => {
    const found = source[`${specific}_${suffix}`] ?? source[`${general}_${suffix}`];
    return found === undefined || found === '' ? undefined : found;
  };

  // A secret arriving through a client-prefixed variable is published, whether anything reads
  // it or not. `@fluixi/start`'s guard fails the build; this catches the case where the build
  // guard is not in play, and says the same thing.
  if (clientPrefix) {
    const exposed = Object.keys(source).filter(
      (name) => name.startsWith(clientPrefix) && SECRETISH.test(name.slice(clientPrefix.length)),
    );
    if (exposed.length) {
      throw new Error(
        `[fluixi/oauth2] ${exposed.join(', ')} ${exposed.length > 1 ? 'are' : 'is'} prefixed \`${clientPrefix}\`, which inlines the value into the browser bundle. ` +
          'Drop the prefix and read it on the server: `credentialsFromEnv` looks for the unprefixed name.',
      );
    }
  }

  const name = (options.provider ?? read('PROVIDER') ?? 'oidc') as PresetName;
  if (!(name in presets)) {
    throw new Error(
      `[fluixi/oauth2] ${specific}_PROVIDER is "${name}", which is not a preset. ` +
        `Use one of ${Object.keys(presets).join(', ')}, or \`oidc\` with an issuer for anything else.`,
    );
  }

  const clientId = read('CLIENT_ID');
  if (!clientId) {
    throw new Error(
      `[fluixi/oauth2] no client id. Set ${specific}_CLIENT_ID (or ${general}_CLIENT_ID).`,
    );
  }

  const scopes = scopeList(read('SCOPES'));
  const audience = read('AUDIENCE');
  const rolesClaim = read('ROLES_CLAIM');

  /** Names the variable a preset needs, so a missing one says which to set. */
  const require = (suffix: string): string => {
    const found = read(suffix);
    if (!found) {
      throw new Error(
        `[fluixi/oauth2] the ${name} preset needs ${specific}_${suffix}, which is not set.`,
      );
    }
    return found;
  };

  let provider: ProviderPreset;
  switch (name) {
    case 'keycloak':
      provider = presets.keycloak({
        baseUrl: require('BASE_URL'),
        realm: require('REALM'),
        scopes,
      });
      break;
    case 'auth0':
      provider = presets.auth0({
        domain: require('DOMAIN'),
        audience,
        scopes,
        rolesClaim,
      });
      break;
    case 'okta': {
      const server = read('AUTH_SERVER');
      provider = presets.okta({
        domain: require('DOMAIN'),
        // `org` names the org server, which the preset takes as null.
        authorizationServer: server === 'org' ? null : server,
        scopes,
        dpop: flag(read('DPOP')),
      });
      break;
    }
    case 'google':
      provider = presets.google({ scopes, hostedDomain: read('HOSTED_DOMAIN') });
      break;
    case 'dex':
      provider = presets.dex({ baseUrl: require('BASE_URL'), scopes });
      break;
    case 'oauth2':
      provider = presets.oauth2({
        issuer: require('ISSUER'),
        endpoints: {
          authorization: require('AUTHORIZATION_ENDPOINT'),
          token: require('TOKEN_ENDPOINT'),
          userinfo: read('USERINFO_ENDPOINT'),
          revocation: read('REVOCATION_ENDPOINT'),
          introspection: read('INTROSPECTION_ENDPOINT'),
        },
        scopes,
        audience: audience ?? (flag(read('NO_AUDIENCE')) ? false : undefined),
        roles: options.roles,
      });
      break;
    default:
      provider = presets.oidc({
        issuer: require('ISSUER'),
        scopes,
        // A provider putting no `aud` on an access token. Keycloak without a mapper is the
        // common case, and the preset moves the check to `azp` rather than dropping it.
        audience: audience ?? (flag(read('NO_AUDIENCE')) ? false : undefined),
        roles: options.roles,
      });
  }

  // An explicit override beats the preset, which is how an app turns DPoP off for a provider
  // that has it on by default.
  const dpop = flag(read('DPOP'));
  if (dpop !== undefined) provider = { ...provider, client: { ...provider.client, dpop } };
  if (options.roles) provider = { ...provider, roles: options.roles };

  const tokens = options.tokens ?? ((read('TOKENS') as 'browser' | 'server' | undefined) ?? 'browser');
  if (tokens !== 'browser' && tokens !== 'server') {
    throw new Error(
      `[fluixi/oauth2] ${specific}_TOKENS is "${tokens}". It is \`browser\` or \`server\`.`,
    );
  }

  const redirectUri = read('REDIRECT_URI');

  return {
    provider,
    providerName: name,
    clientId,
    tokens,
    redirectUri,
    scopes,
    client: { ...provider.client, clientId, tokens, ...(redirectUri ? { redirectUri } : {}) },
  };
}
