/**
 * Authentication wired into an app: the files, the registrations and the variables.
 *
 * One implementation for `fluixi g auth`, `fluixi add auth` and create-fluixi, so a new app and
 * an existing one get the same code. It works from a project root, writes only files that do
 * not exist yet, and returns what it did for the caller to report.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { addEnvExample, addEnvPublic, addImport, register, type Step } from './edit.js';
import * as t from './templates.js';

export type Format = 'jsx' | 'html';
export type Tokens = 'browser' | 'server';

export interface OAuth2Options {
  provider?: t.ProviderName;
  tokens?: Tokens;
  format: Format;
}

export interface AuthResult {
  steps: Step[];
  /** Packages the wiring imports, with the spec to install. */
  dependencies: Record<string, string>;
  /** What is left to the developer, one line each. */
  next: string[];
  /** Decided rather than asked, worth saying (a provider forcing server tokens). */
  notes: string[];
}

/** A refusal the caller reports as it reports any bad input. */
export class ScaffoldError extends Error {}

/** `jsx` when the project's tsconfig configures it, `html` for an html``-authored one. */
export function projectFormat(root: string): Format {
  try {
    const ts = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8'));
    if (ts?.compilerOptions && !ts.compilerOptions.jsx) return 'html';
  } catch {
    // No tsconfig, or one with comments: JSX, the default.
  }
  return 'jsx';
}

/** A path for an import between two files, with the .js extension ESM needs. */
export function importPath(from: string, to: string): string {
  const p = relative(dirname(from), to).replace(/\\/g, '/').replace(/\.tsx?$/, '.js');
  return p.startsWith('.') ? p : `./${p}`;
}

/** Write a file the app may already have, keeping theirs. Returns whether it wrote. */
export function writeOnce(log: Step[], file: string, content: string): boolean {
  if (existsSync(file)) {
    log.push({ kind: 'kept', file });
    return false;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  log.push({ kind: 'created', file });
  return true;
}

const APP_HEADER = '// Registered by @fluixi/start ahead of both entries.\n';
const APP_SERVER_HEADER = '// Only the server build imports this file, so what it lists never reaches the browser.\n';

/** List a module in `src/app.config.ts`, or `app.config.server.ts` for a server one. */
export function registerModule(log: Step[], root: string, server: boolean, file: string, name: string, entry = name): void {
  const config = join(root, server ? 'src/app.config.server.ts' : 'src/app.config.ts');
  register(log, config, server ? APP_SERVER_HEADER : APP_HEADER, {
    importLine: `import { ${name} } from '${importPath(config, file)}';`,
    entry,
  });
}

/** `src/config/env.ts` with the `auth` reader: created when missing, appended when not there. */
export function ensureAuthEnv(log: Step[], root: string): void {
  const file = join(root, 'src/config/env.ts');
  if (writeOnce(log, file, t.authEnvConfig())) return;
  let text = readFileSync(file, 'utf8');
  if (/export\s+const\s+auth\b/.test(text)) return;
  if (!/\bpublicEnv\b/.test(text)) text = addImport(text, `import { publicEnv } from '@fluixi/start/env';`);
  text = addImport(text, `import { authFromEnv } from '@fluixi/oauth2/env';`);
  writeFileSync(file, `${text.replace(/\n*$/, '\n')}\n${t.AUTH_READER}`);
  log.push({ kind: 'updated', file, detail: 'auth' });
}

/** The token mode for a provider: what was asked, checked, or the provider's only option. */
export function resolveTokens(provider: t.ProviderName, tokens: Tokens | undefined): { tokens: Tokens; forced: boolean } {
  const refusal = t.SERVER_ONLY[provider];
  if (refusal && tokens === 'browser') throw new ScaffoldError(`${provider} needs server tokens: ${refusal}`);
  return { tokens: tokens ?? (refusal ? 'server' : 'browser'), forced: !!refusal && !tokens };
}

export function setupOAuth2(root: string, options: OAuth2Options, dependencySpec = 'alpha'): AuthResult {
  const provider = options.provider ?? 'oidc';
  if (!t.PROVIDERS.includes(provider)) throw new ScaffoldError(`unknown provider ${provider}: ${t.PROVIDERS.join(', ')}`);
  const { tokens, forced } = resolveTokens(provider, options.tokens);
  const html = options.format === 'html';
  const ext = html ? 'ts' : 'tsx';
  const steps: Step[] = [];
  const at = (rel: string) => join(root, rel);

  ensureAuthEnv(steps, root);
  const service = at('src/services/auth.ts');
  if (writeOnce(steps, service, t.authServiceFile(tokens))) registerModule(steps, root, false, service, 'AuthModule');
  if (tokens === 'browser') writeOnce(steps, at(`src/routes/callback.${ext}`), t.callbackRoute(html));
  writeOnce(steps, at(`src/routes/login.${ext}`), t.loginRoute(html));
  if (tokens === 'server') {
    const server = at('src/services/auth.server.ts');
    if (writeOnce(steps, server, t.authServerFile())) registerModule(steps, root, true, server, 'authServer', 'authServer()');
  }

  const vars = {
    AUTH_PROVIDER: provider,
    AUTH_CLIENT_ID: 'my-app',
    AUTH_TOKENS: tokens,
    ...t.PROVIDER_VARS[provider],
    APP_URL: 'http://localhost:3000',
  };
  addEnvPublic(steps, at('fluixi.config.ts'), Object.keys(vars));
  addEnvExample(steps, at('.env.example'), `@fluixi/oauth2 (${provider}). Listed in env.public: the browser sees them.`, vars);
  if (tokens === 'server') {
    addEnvExample(steps, at('.env.example'), 'Server only, never in env.public. SESSION_SECRET: 32 bytes or more.', {
      OIDC_CLIENT_SECRET: '',
      SESSION_SECRET: '',
    });
  }

  const redirect = tokens === 'browser' ? '/callback' : '/auth/callback';
  return {
    steps,
    dependencies: { '@fluixi/oauth2': dependencySpec },
    next: ['copy .env.example to .env and fill it in', `register <APP_URL>${redirect} as the redirect URI at the provider`],
    notes: forced ? [`${provider} refuses a public client, so the tokens stay on the server`] : [],
  };
}

export function setupBetterAuth(root: string, dependencySpec = 'alpha'): AuthResult {
  const steps: Step[] = [];
  const at = (rel: string) => join(root, rel);
  writeOnce(steps, at('src/auth.config.ts'), t.betterAuthConfig());
  writeOnce(steps, at('src/auth.client.ts'), t.betterAuthClient());
  if (!writeOnce(steps, at('src/middleware.ts'), t.betterAuthMiddleware())) {
    steps.push({
      kind: 'hint',
      file: at('src/middleware.ts'),
      lines: [`import { authMiddleware } from '@fluixi/auth/server';`, `import './auth.config.js';`, 'authMiddleware() in the middleware list'],
    });
  }
  writeOnce(steps, at('src/api/auth/[...all].ts'), t.betterAuthRoute());
  return {
    steps,
    dependencies: { '@fluixi/auth': dependencySpec, 'better-auth': '^1' },
    next: ['set your database adapter in src/auth.config.ts'],
    notes: [],
  };
}
