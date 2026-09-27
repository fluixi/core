/**
 * `fluixi generate <kind> <name>` (alias `g`), scaffold a piece into the current app.
 *   fluixi g component Button        → src/components/Button.tsx
 *   fluixi g route about             → src/routes/about.tsx  (a file route)
 *   fluixi g route blog/[id]         → src/routes/blog/[id].tsx
 *   fluixi g middleware              → src/middleware.ts
 *   fluixi g service Orders          → src/services/orders.ts, listed in src/app.config.ts
 *   fluixi g auth oauth2             → env config, auth service, callback and login routes
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, basename } from 'node:path';
import { c } from '@fluixi/start/ui';
import { addEnvExample, addEnvPublic, addImport, envPublicNames, register } from './edit.js';
import * as t from './templates.js';

const GEN_USAGE = `Usage: fluixi generate <kind> [name] [options]

Kinds:
  component <Name>            a reusable component         → src/components/<Name>.{tsx,ts}
  route <path>                a file-based route page      → src/routes/<path>.{tsx,ts}
  middleware                  the request middleware file  → src/middleware.ts
  env                         typed config from env.public → src/config/env.ts
  module <name>               an app module                → src/services/<name>/<name>.module.ts
  service <Name> [--server]   a service, token and module  → src/services/<name>.ts (.server.ts)
  api <path> [--role <role>]  an API route, guarded by role → src/api/<path>.ts
  server-fn <name>            a "use server" function      → src/server/<name>.ts
  auth oauth2 [--provider <p>] [--tokens browser|server]
                              @fluixi/oauth2 wiring: env config, service, routes, .env.example
  auth better-auth            @fluixi/auth wiring          → auth.config + auth.client + middleware + /api/auth

Modules and services are listed in src/app.config.ts, or app.config.server.ts for --server,
which is created when missing. Providers: ${t.PROVIDERS.join(', ')}.
Component/route syntax follows the project (JSX → .tsx, html\`\` → .ts); override with --jsx / --html.
`;

/**
 * Which template syntax to emit. Explicit --jsx/--html wins; otherwise infer from
 * the project: an app whose tsconfig doesn't configure `jsx` is html``-authored.
 */
function detectFormat(): 'jsx' | 'html' {
  const args = process.argv.slice(3);
  if (args.includes('--html')) return 'html';
  if (args.includes('--jsx')) return 'jsx';
  try {
    const ts = JSON.parse(readFileSync(resolve('tsconfig.json'), 'utf8'));
    if (ts?.compilerOptions && !ts.compilerOptions.jsx) return 'html';
  } catch {
    // no/invalid tsconfig: fall back to JSX
  }
  return 'jsx';
}

function pascal(s: string): string {
  return s
    .replace(/\[(.+?)\]/g, '$1') // drop dynamic-segment brackets
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('') || 'Component';
}

/**
 * Say how to use a generated component without importing it, when nothing would resolve it.
 *
 * Read-only on purpose. A vite/fluixi config is arbitrary TypeScript, it can spread a
 * shared object, compute its rules, or call a resolver function, so editing it means
 * parsing and reprinting, which loses the author's formatting and breaks on any shape we
 * didn't anticipate. Printing the line to paste costs the user one paste and cannot
 * corrupt anything.
 *
 * Nothing is printed when a rule already exists, or when there is no config to look at.
 */
function resolveHint(Name: string, ext: string): void {
  const configs = ['vite.config.ts', 'vite.config.js', 'fluixi.config.ts', 'fluixi.config.js'];
  const found = configs.map((f) => resolve(f)).find((f) => existsSync(f));
  if (!found) return;

  try {
    // `resolve:` inside the fluixi() options is the only thing we're looking for. A false
    // positive here just means we stay quiet, which is the right way to be wrong.
    if (/\bresolve\s*:\s*\[/.test(readFileSync(found, 'utf8'))) return;
  } catch {
    return;
  }

  console.log(
    `  ${c.gray('to use')} ${c.cyan(`<${Name} />`)} ${c.gray('without importing it, add to')} ` +
      `${c.cyan(relative(process.cwd(), found))}:`,
  );
  console.log(`    ${c.gray(`resolve: [{ match: /^([A-Z]\\w+)$/, module: '/src/components/$1.${ext}' }]`)}`);
  console.log(`  ${c.gray('one pattern covers the whole folder. Importing it works too — including with')} ${c.cyan('load:')}`);
}

/** The value of `--name value` or `--name=value`. */
function option(name: string): string | undefined {
  const args = process.argv;
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** A path for an import between two files under src, with the .js extension ESM needs. */
function importPath(from: string, to: string): string {
  const p = relative(dirname(from), to).replace(/\\/g, '/').replace(/\.tsx?$/, '.js');
  return p.startsWith('.') ? p : `./${p}`;
}

/** Write a file the app may already have, keeping theirs. Returns whether it wrote. */
function writeOnce(file: string, content: string): boolean {
  if (existsSync(file)) {
    console.log(`  ${c.gray('-')} ${c.cyan(relative(process.cwd(), file))} ${c.gray('exists, kept')}`);
    return false;
  }
  write(file, content);
  return true;
}

const APP_CONFIG = 'src/app.config.ts';
const APP_CONFIG_SERVER = 'src/app.config.server.ts';
const APP_HEADER = '// Registered by @fluixi/start ahead of both entries.\n';
const APP_SERVER_HEADER = '// Only the server build imports this file, so what it lists never reaches the browser.\n';

function registerIn(server: boolean, file: string, name: string, entry = name): void {
  const config = resolve(server ? APP_CONFIG_SERVER : APP_CONFIG);
  register(config, server ? APP_SERVER_HEADER : APP_HEADER, {
    importLine: `import { ${name} } from '${importPath(config, file)}';`,
    entry,
  });
}

function write(file: string, content: string): void {
  const rel = relative(process.cwd(), file);
  if (existsSync(file)) {
    console.error(`  ${c.red('✗')} ${rel} ${c.gray('already exists')}`);
    process.exit(1);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`  ${c.green('✓')} ${c.gray('created')} ${c.cyan(rel)}`);
}

const component = (Name: string) =>
  `import type { Component, ComponentChild } from '@fluixi/core';

export type ${Name}Props = {
  children?: ComponentChild;
};

// Typed component: \`props\` is inferred from ${Name}Props. Use FxParent/FxVoid/FxFlow
// from '@fluixi/core' for children-required/forbidden variants.
export const ${Name}: Component<${Name}Props> = (props) => {
  return <div class="${Name.toLowerCase()}">{props.children ?? '${Name}'}</div>;
};
`;

const route = (Name: string) =>
  `export default function ${Name}() {
  return (
    <section>
      <h1>${Name}</h1>
    </section>
  );
}
`;

// html`` variants: plain .ts, no JSX. Emitted when the project is html``-authored
// (no `jsx` in tsconfig) or with --html.
const componentHtml = (Name: string) =>
  `import type { Component, ComponentChild } from '@fluixi/core';
import { html } from '@fluixi/core';

export type ${Name}Props = {
  children?: ComponentChild;
};

// Typed component: \`props\` is inferred from ${Name}Props. Use FxParent/FxVoid/FxFlow
// from '@fluixi/core' for children-required/forbidden variants.
export const ${Name}: Component<${Name}Props> = (props) => {
  return html\`<div class="${Name.toLowerCase()}">\${props.children ?? '${Name}'}</div>\`;
};
`;

const routeHtml = (Name: string) =>
  `import { html } from '@fluixi/start';

export default function ${Name}() {
  return html\`
    <section>
      <h1>${Name}</h1>
    </section>
  \`;
}
`;

const middleware = () =>
  `import { defineMiddleware } from '@fluixi/start';

export default defineMiddleware([
  (request, next) => {
    // return a Response to short-circuit (auth/redirect), or next() to continue.
    return next();
  },
]);
`;

const authConfig = () =>
  `import { betterAuth } from 'better-auth';
import { defineAuth } from '@fluixi/auth/server';

export type AppUser = { id: string; email: string; name?: string; role?: string };

// Better Auth owns the audited primitives; defineAuth registers it with @fluixi/auth.
export const auth = defineAuth<AppUser>(
  betterAuth({
    // database: <your adapter>,
    emailAndPassword: { enabled: true },
    // socialProviders: { google: { … }, github: { … } },
  } as Parameters<typeof betterAuth>[0]),
);
`;

const authClient = () =>
  `import { createAuthClient } from 'better-auth/client';
import { createAuthHooks } from '@fluixi/auth/client';
import type { AppUser } from './auth.config.js';

const client = createAuthClient({ baseURL: '/api/auth' });

// Or, to reuse an existing reactive session: createAuthHooks({ session: yourSessionStore }).
export const { useUser, useSession, useAuth, useSignIn, useSignOut, protectedRoute } =
  createAuthHooks<AppUser>({ client, loginPath: '/login' });
`;

const authMiddleware = () =>
  `import { defineMiddleware } from '@fluixi/start';
import { authMiddleware } from '@fluixi/auth/server';
import './auth.config.js';

export default defineMiddleware([authMiddleware()]);
`;

const authRoute = () =>
  `import { mountAuthRoutes } from '@fluixi/auth/server';
import '../../auth.config.js';

const handler = mountAuthRoutes();
export const GET = handler;
export const POST = handler;
export default handler;
`;

export function generate(kind: string | undefined, name: string | undefined): void {
  switch (kind) {
    case 'component':
    case 'c': {
      if (!name) return fail('component name required, e.g. `fluixi g component Button`');
      const Name = pascal(name);
      const html = detectFormat() === 'html';
      const ext = html ? 'ts' : 'tsx';
      write(resolve('src/components', `${Name}.${ext}`), (html ? componentHtml : component)(Name));
      resolveHint(Name, ext);
      break;
    }
    case 'route':
    case 'r': {
      if (!name) return fail('route path required, e.g. `fluixi g route about`');
      const html = detectFormat() === 'html';
      const Name = pascal(basename(name));
      write(resolve('src/routes', `${name}.${html ? 'ts' : 'tsx'}`), (html ? routeHtml : route)(Name));
      break;
    }
    case 'middleware':
    case 'm':
      write(resolve('src/middleware.ts'), middleware());
      break;
    case 'env': {
      const names = (envPublicNames(resolve('fluixi.config.ts')) ?? []).filter((n) => !n.startsWith('AUTH_'));
      write(resolve('src/config/env.ts'), t.envConfig(names));
      break;
    }
    case 'module': {
      if (!name) return fail('module name required, e.g. `fluixi g module billing`');
      const slug = kebab(name);
      const file = resolve('src/services', slug, `${slug}.module.ts`);
      write(file, t.moduleFile(pascal(name), slug));
      registerIn(false, file, `${pascal(name)}Module`);
      break;
    }
    case 'service':
    case 's': {
      if (!name) return fail('service name required, e.g. `fluixi g service Orders`');
      const Name = pascal(name).replace(/Service$/, '') || 'App';
      const server = process.argv.includes('--server');
      const file = resolve('src/services', `${kebab(Name)}${server ? '.server' : ''}.ts`);
      write(file, t.serviceFile(Name, kebab(Name), server));
      registerIn(server, file, `${Name}Module`);
      break;
    }
    case 'api': {
      if (!name) return fail('api path required, e.g. `fluixi g api users/[id]`');
      const file = resolve('src/api', `${name.replace(/\.ts$/, '')}.ts`);
      const role = option('role');
      if (!role) {
        write(file, t.apiRoute());
        break;
      }
      const verify = resolve('src/services/verify.server.ts');
      write(file, t.guardedApiRoute(importPath(file, verify), role));
      writeOnce(verify, t.verifyServer());
      ensureAuthEnv();
      break;
    }
    case 'server-fn': {
      if (!name) return fail('function name required, e.g. `fluixi g server-fn getUser`');
      const fn = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, ch: string) => ch.toUpperCase());
      write(resolve('src/server', `${fn}.ts`), t.serverFn(fn));
      break;
    }
    case 'auth':
      if (name === 'oauth2') return oauth2();
      if (name && name !== 'better-auth') return fail(`unknown auth kind ${name}: oauth2 or better-auth`);
      write(resolve('src/auth.config.ts'), authConfig());
      write(resolve('src/auth.client.ts'), authClient());
      write(resolve('src/middleware.ts'), authMiddleware());
      write(resolve('src/api/auth/[...all].ts'), authRoute());
      console.log(`  ${c.gray('next: install')} ${c.cyan('better-auth')}${c.gray(' and set your DB adapter in auth.config.ts')}`);
      break;
    default:
      console.error(GEN_USAGE);
      process.exit(1);
  }
}

/** `src/config/env.ts` with the `auth` reader: created when missing, appended when not there. */
function ensureAuthEnv(): void {
  const file = resolve('src/config/env.ts');
  if (writeOnce(file, t.authEnvConfig())) return;
  let text = readFileSync(file, 'utf8');
  if (/export\s+const\s+auth\b/.test(text)) return;
  if (!/\bpublicEnv\b/.test(text)) text = addImport(text, `import { publicEnv } from '@fluixi/start/env';`);
  text = addImport(text, `import { authFromEnv } from '@fluixi/oauth2/env';`);
  writeFileSync(file, `${text.replace(/\n*$/, '\n')}\n${t.AUTH_READER}`);
  console.log(`  ${c.green('✓')} ${c.gray('updated')} ${c.cyan('src/config/env.ts')}${c.gray(': auth')}`);
}

function oauth2(): void {
  const provider = (option('provider') ?? 'oidc') as t.ProviderName;
  if (!t.PROVIDERS.includes(provider)) return fail(`unknown provider ${provider}: ${t.PROVIDERS.join(', ')}`);
  let tokens = option('tokens') as 'browser' | 'server' | undefined;
  if (tokens && tokens !== 'browser' && tokens !== 'server') return fail('--tokens is browser or server');
  const refusal = t.SERVER_ONLY[provider];
  if (refusal && tokens === 'browser') return fail(`${provider} needs --tokens server: ${refusal}`);
  if (refusal && !tokens) console.log(`  ${c.gray(`${provider} refuses a public client, so the tokens stay on the server`)}`);
  tokens ??= refusal ? 'server' : 'browser';
  const html = detectFormat() === 'html';
  const ext = html ? 'ts' : 'tsx';

  ensureAuthEnv();
  const service = resolve('src/services/auth.ts');
  if (writeOnce(service, t.authServiceFile(tokens))) registerIn(false, service, 'AuthModule');
  if (tokens === 'browser') writeOnce(resolve('src/routes', `callback.${ext}`), t.callbackRoute(html));
  writeOnce(resolve('src/routes', `login.${ext}`), t.loginRoute(html));
  if (tokens === 'server') {
    const server = resolve('src/services/auth.server.ts');
    if (writeOnce(server, t.authServerFile())) registerIn(true, server, 'authServer', 'authServer()');
  }

  const vars = { AUTH_PROVIDER: provider, AUTH_CLIENT_ID: 'my-app', AUTH_TOKENS: tokens, ...t.PROVIDER_VARS[provider], APP_URL: 'http://localhost:3000' };
  addEnvPublic(resolve('fluixi.config.ts'), Object.keys(vars));
  addEnvExample(resolve('.env.example'), `@fluixi/oauth2 (${provider}). Listed in env.public: the browser sees them.`, vars);
  if (tokens === 'server') {
    addEnvExample(resolve('.env.example'), 'Server only, never in env.public. SESSION_SECRET: 32 bytes or more.', {
      OIDC_CLIENT_SECRET: '',
      SESSION_SECRET: '',
    });
  }
  const redirect = tokens === 'browser' ? '/callback' : '/auth/callback';
  console.log(`  ${c.gray('next: install')} ${c.cyan('@fluixi/oauth2')}${c.gray(`, copy .env.example to .env, and register <APP_URL>${redirect} as the redirect URI`)}`);
}

function fail(msg: string): void {
  console.error(`  ${c.red('✗')} ${msg}`);
  process.exit(1);
}
