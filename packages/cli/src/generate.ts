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
import {
  envPublicNames,
  ensureAuthEnv,
  registerModule,
  ScaffoldError,
  setupBetterAuth,
  setupOAuth2,
  templates as t,
  writeOnce as writeOnceTo,
  importPath,
  type ProviderName,
  type Step,
  type Tokens,
} from './scaffold/index.js';
import { report, reportAuth } from './report.js';

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
                              (fluixi add auth does the same, asks, and installs)
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

/** Write a file the app may already have, keeping theirs. Returns whether it wrote. */
function writeOnce(file: string, content: string): boolean {
  const steps: Step[] = [];
  const wrote = writeOnceTo(steps, file, content);
  report(steps);
  return wrote;
}

function registerIn(server: boolean, file: string, name: string, entry = name): void {
  const steps: Step[] = [];
  registerModule(steps, process.cwd(), server, file, name, entry);
  report(steps);
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
      {
        const steps: Step[] = [];
        ensureAuthEnv(steps, process.cwd());
        report(steps);
      }
      break;
    }
    case 'server-fn': {
      if (!name) return fail('function name required, e.g. `fluixi g server-fn getUser`');
      const fn = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, ch: string) => ch.toUpperCase());
      write(resolve('src/server', `${fn}.ts`), t.serverFn(fn));
      break;
    }
    case 'auth':
      try {
        if (name === 'oauth2') {
          reportAuth(
            setupOAuth2(process.cwd(), {
              provider: option('provider') as ProviderName | undefined,
              tokens: tokensOption(),
              format: detectFormat(),
            }),
            'install @fluixi/oauth2',
          );
        } else if (!name || name === 'better-auth') {
          reportAuth(setupBetterAuth(process.cwd()), 'install @fluixi/auth and better-auth');
        } else {
          return fail(`unknown auth kind ${name}: oauth2 or better-auth`);
        }
      } catch (error) {
        if (error instanceof ScaffoldError) return fail(error.message);
        throw error;
      }
      break;
    default:
      console.error(GEN_USAGE);
      process.exit(1);
  }
}

function tokensOption(): Tokens | undefined {
  const tokens = option('tokens');
  if (tokens !== undefined && tokens !== 'browser' && tokens !== 'server') {
    fail('--tokens is browser or server');
  }
  return tokens as Tokens | undefined;
}

function fail(msg: string): void {
  console.error(`  ${c.red('✗')} ${msg}`);
  process.exit(1);
}
