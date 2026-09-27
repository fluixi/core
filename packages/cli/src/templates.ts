/** What the env, module, service, api, server-fn and oauth2 generators write. */

export const camel = (name: string) =>
  name.toLowerCase().replace(/_+([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());

export const envConfig = (names: string[]) => {
  const fields = names.length
    ? names.map((n) => `  ${camel(n)}: '${n}',`).join('\n')
    : `  // apiUrl: 'API_URL',`;
  return `import { pickEnv } from '@fluixi/start/env';

// Every missing variable is reported at once, when this module loads. A field that may be
// unset takes { key, optional: true } or { key, default }; parse: asNumber and friends convert.
export const config = pickEnv({
${fields}
});
`;
};

export const moduleFile = (Name: string, name: string) => `import { defineModule } from '@fluixi/start/app';

export const ${Name}Module = defineModule({
  name: '${name}',
  imports: [],
  providers: [],
});
`;

export const serviceFile = (Name: string, name: string, server: boolean) => `${
  server ? `// Server only: the browser build refuses a page that imports this file.\n` : ''
}import { injectionToken } from '@fluixi/start/di';
import { defineModule } from '@fluixi/start/app';

export class ${Name}Service {}

export const ${Name}Token = injectionToken<${Name}Service>('${Name}');

export const ${Name}Module = defineModule({
  name: '${name}',
  providers: [{ provide: ${Name}Token, useFactory: () => new ${Name}Service() }],
});
`;

export const apiRoute = () => `export function GET(request: Request) {
  return Response.json({ path: new URL(request.url).pathname });
}
`;

export const guardedApiRoute = (guardImport: string, role: string) => `import { guard } from '${guardImport}';

export const GET = guard(
  async (request, claims) => {
    return Response.json({ sub: claims.sub });
  },
  { role: '${role}' },
);
`;

export const verifyServer = () => `import { createTokenVerifier, createApiGuard } from '@fluixi/oauth2/verify';
import { auth } from '../config/env.js';

// Checks a bearer token's signature, issuer, audience and expiry against the provider.
export const verify = createTokenVerifier(auth.provider.verifier(auth.clientId));

// Answers 401 without a valid token and 403 without the role.
export const guard = createApiGuard({ verify, roles: auth.provider.roles });
`;

export const serverFn = (name: string) => `export async function ${name}(input: { id: string }) {
  'use server';
  // Runs on the server only. The browser calls it over RPC, so input and result are plain data.
  return { id: input.id };
}
`;

// ── oauth2 ──────────────────────────────────────────────────────────────────

export const PROVIDERS = ['oidc', 'keycloak', 'auth0', 'okta', 'google', 'dex', 'oauth2'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

/** Providers that refuse a public client, so tokens must stay on the server. */
export const SERVER_ONLY: Partial<Record<ProviderName, string>> = {
  google: 'Google answers a token request without a client secret with `client_secret is missing`',
  dex: 'Dex sends no CORS headers on discovery or the token endpoint',
};

/** The variables each preset needs beyond the common ones, with a placeholder. */
export const PROVIDER_VARS: Record<ProviderName, Record<string, string>> = {
  oidc: { AUTH_ISSUER: 'https://id.example.com' },
  keycloak: { AUTH_BASE_URL: 'http://localhost:8080', AUTH_REALM: 'master' },
  auth0: { AUTH_DOMAIN: 'example.eu.auth0.com', AUTH_AUDIENCE: 'https://api.example.com' },
  okta: { AUTH_DOMAIN: 'example.okta.com' },
  google: {},
  dex: { AUTH_BASE_URL: 'http://localhost:5556/dex' },
  oauth2: {
    AUTH_ISSUER: 'https://id.example.com',
    AUTH_AUTHORIZATION_ENDPOINT: 'https://id.example.com/authorize',
    AUTH_TOKEN_ENDPOINT: 'https://id.example.com/token',
  },
};

export const AUTH_READER = `// Provider, issuer, client and token mode from the AUTH_* variables in env.public. Moving to
// another provider is a change to .env.
export const auth = authFromEnv(publicEnv(), { clientPrefix: '' });
`;

export const authEnvConfig = () => `import { publicEnv } from '@fluixi/start/env';
import { authFromEnv } from '@fluixi/oauth2/env';

${AUTH_READER}`;

export const authServiceFile = (tokens: 'browser' | 'server') => `import { createAuthService, authModule } from '@fluixi/oauth2';
import { env } from '@fluixi/start/env';
${tokens === 'browser' ? `import { auth as authEnv } from '../config/env.js';\n` : ''}
export interface User {
  sub: string;
  email?: string;
  name?: string;
}

const appUrl = env('APP_URL') ?? 'http://localhost:3000';

export const auth = createAuthService<User>({
${
  tokens === 'browser'
    ? `  config: {
    ...authEnv.client,
    tokens: 'browser',
    redirectUri: \`\${appUrl}/callback\`,
    postLogoutRedirectUri: \`\${appUrl}/login\`,
  },`
    : `  // The tokens stay on the server behind an httpOnly cookie. The browser calls the routes
  // auth.server.ts mounts under basePath and never sees a token.
  config: {
    tokens: 'server',
    redirectUri: \`\${appUrl}/auth/callback\`,
    postLogoutRedirectUri: \`\${appUrl}/login\`,
    basePath: '/auth',
  },`
}
});

export const AuthModule = authModule(auth);
export const { protectedRoute, Protect, Can, useUser } = auth;
`;

export const authServerFile = () => `import { authServerModule } from '@fluixi/oauth2/server';
import { publicEnv, serverEnv } from '@fluixi/start/env';
import { auth } from '../config/env.js';

// A function: serverEnv with required throws when a secret is unset, and it is only read
// when app.config.server.ts registers this.
export function authServer() {
  const appUrl = publicEnv().APP_URL ?? 'http://localhost:3000';
  return authServerModule({
    ...auth.client,
    clientSecret: serverEnv('OIDC_CLIENT_SECRET', { required: true }),
    cookieSecret: serverEnv('SESSION_SECRET', { required: true }),
    redirectUri: \`\${appUrl}/auth/callback\`,
    defaultReturnTo: '/',
    secureCookie: appUrl.startsWith('https://'),
  });
}
`;

export const callbackRoute = (html: boolean) =>
  html
    ? `import { html } from '@fluixi/core';
import { OAuthCallback } from '@fluixi/oauth2/callback';

export default OAuthCallback({
  pending: () => html\`<p>Signing you in</p>\`,
  failed: (reason) => html\`<p>\${reason}</p><a href="/login">Try again</a>\`,
});
`
    : `import { OAuthCallback } from '@fluixi/oauth2/callback';

export default OAuthCallback({
  pending: () => <p>Signing you in</p>,
  failed: (reason) => (
    <>
      <p>{reason}</p>
      <a href="/login">Try again</a>
    </>
  ),
});
`;

export const loginRoute = (html: boolean) =>
  html
    ? `import { html } from '@fluixi/core';
import { auth } from '../services/auth.js';

export default function Login() {
  return html\`<button @click=\${() => auth.signIn({ returnTo: '/' })}>Sign in</button>\`;
}
`
    : `import { auth } from '../services/auth.js';

export default function Login() {
  return <button onClick={() => auth.signIn({ returnTo: '/' })}>Sign in</button>;
}
`;
