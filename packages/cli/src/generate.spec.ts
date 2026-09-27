/**
 * `fluixi generate` writes into the directory it runs from, so these run it in a
 * temporary one and read back what landed.
 *
 * What is pinned is the naming: which directory a kind goes to, how a name becomes a
 * component name, and whether the file is `.tsx` or `.ts`, that follows the
 * project's own syntax and has been wrong in both directions.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { generate } from './generate.js';

let dir: string;
let cwd: string;
let argv: string[];

/** An app rooted at a temp dir, with the tsconfig `detectFormat` reads. */
function app(tsconfig: Record<string, unknown>): void {
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig));
}

beforeEach(() => {
  cwd = process.cwd();
  argv = process.argv;
  dir = mkdtempSync(join(tmpdir(), 'fx-cli-'));
  process.chdir(dir);
  // generate() reads flags off argv, which would otherwise be vitest's own.
  process.argv = ['node', 'fluixi', 'generate'];
});

afterEach(() => {
  process.chdir(cwd);
  process.argv = argv;
  rmSync(dir, { recursive: true, force: true });
});

describe('generate component', () => {
  it('writes a .tsx component for a JSX project', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('component', 'button');

    const file = join(dir, 'src/components/Button.tsx');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('export const Button');
  });

  it('writes a .ts component for a project with no jsx configured', () => {
    // No `jsx` in tsconfig means the app authors in html``, emitting .tsx there
    // produces a file the project cannot compile.
    app({ compilerOptions: {} });
    generate('component', 'button');

    expect(existsSync(join(dir, 'src/components/Button.ts'))).toBe(true);
    expect(readFileSync(join(dir, 'src/components/Button.ts'), 'utf8')).toContain('html`');
  });

  it('takes the syntax from --html over the project', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    process.argv = ['node', 'fluixi', 'generate', '--html'];
    generate('component', 'button');

    expect(existsSync(join(dir, 'src/components/Button.ts'))).toBe(true);
  });
});

describe('generate route', () => {
  it('keeps the path and names the component after its last segment', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('route', 'blog/[id]');

    // The file keeps the dynamic segment: that is the routing contract, while the
    // component name drops the brackets, which are not valid in an identifier.
    const file = join(dir, 'src/routes/blog/[id].tsx');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('export default function Id');
  });
});

describe('generate middleware', () => {
  it('writes one file at the root of src', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('middleware', undefined);

    expect(existsSync(join(dir, 'src/middleware.ts'))).toBe(true);
  });
});

describe('the resolve hint', () => {
  it('is printed when nothing would resolve the new component', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fluixi-gen-'));
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"jsx":"preserve"}}');
      writeFileSync(join(dir, 'vite.config.ts'), 'export default { plugins: [fluixi()] };');

      const said: string[] = [];
      const log = console.log;
      console.log = (...a: unknown[]) => said.push(a.join(' '));
      try {
        generate('component', 'Card');
      } finally {
        console.log = log;
      }

      const text = said.join('\n');
      expect(text).toMatch(/without importing it/);
      expect(text).toMatch(/match: \/\^\(\[A-Z\]/);
    } finally {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('says nothing when a rule is already there', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fluixi-gen-'));
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"jsx":"preserve"}}');
      writeFileSync(join(dir, 'vite.config.ts'), 'export default { plugins: [fluixi({ resolve: [] })] };');

      const said: string[] = [];
      const log = console.log;
      console.log = (...a: unknown[]) => said.push(a.join(' '));
      try {
        generate('component', 'Card');
      } finally {
        console.log = log;
      }

      expect(said.join('\n')).not.toMatch(/without importing it/);
    } finally {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

const read = (rel: string) => readFileSync(join(dir, rel), 'utf8');
const put = (rel: string, text: string) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
};

describe('generate module and service', () => {
  it('creates app.config.ts for the first module and appends the next inline', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('module', 'billing');
    generate('service', 'OrdersService');

    expect(read('src/services/billing/billing.module.ts')).toContain(`name: 'billing'`);
    expect(read('src/services/orders.ts')).toContain('export const OrdersToken = injectionToken<OrdersService>');
    const config = read('src/app.config.ts');
    expect(config).toContain(`import { BillingModule } from './services/billing/billing.module.js';\nimport { OrdersModule } from './services/orders.js';\n`);
    expect(config).toContain('imports: [BillingModule, OrdersModule]');
  });

  it('keeps a list written one per line in that layout', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    put('src/app.config.ts', `import { defineApp } from '@fluixi/start/app';\nimport { A } from './a.js';\n\nexport default defineApp({\n  imports: [\n    A,\n  ],\n});\n`);
    generate('module', 'billing');

    expect(read('src/app.config.ts')).toContain(`  imports: [\n    A,\n    BillingModule,\n  ],`);
  });

  it('prints the lines to add when imports is not a plain list', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    const source = `import { defineApp } from '@fluixi/start/app';\nexport default defineApp({ imports: modules() });\n`;
    put('src/app.config.ts', source);
    generate('module', 'billing');

    expect(read('src/app.config.ts')).toBe(source);
  });

  it('registers a --server service in app.config.server.ts only', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    process.argv = ['node', 'fluixi', 'generate', 'service', 'Mailer', '--server'];
    generate('service', 'Mailer');

    expect(existsSync(join(dir, 'src/services/mailer.server.ts'))).toBe(true);
    expect(read('src/app.config.server.ts')).toContain('imports: [MailerModule]');
    expect(existsSync(join(dir, 'src/app.config.ts'))).toBe(false);
  });
});

describe('generate api and server-fn', () => {
  it('guards a route by role and creates the verifier and its env config', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    process.argv = ['node', 'fluixi', 'generate', 'api', 'admin/stats', '--role', 'admin'];
    generate('api', 'admin/stats');

    expect(read('src/api/admin/stats.ts')).toContain(`import { guard } from '../../services/verify.server.js';`);
    expect(read('src/api/admin/stats.ts')).toContain(`{ role: 'admin' }`);
    expect(read('src/services/verify.server.ts')).toContain('createApiGuard({ verify, roles: auth.provider.roles })');
    expect(read('src/config/env.ts')).toContain(`export const auth = authFromEnv(publicEnv(), { clientPrefix: '' });`);
  });

  it('writes a plain handler without --role', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('api', 'users/[id]');
    expect(read('src/api/users/[id].ts')).toContain('export function GET(request: Request)');
  });

  it('names a server function in camel case, carrying the directive', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('server-fn', 'get-user');
    expect(read('src/server/getUser.ts')).toMatch(/export async function getUser\([^)]*\) \{\n  'use server';/);
  });
});

describe('generate env', () => {
  it('fills pickEnv from env.public, leaving the AUTH_ names to authFromEnv', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    put('fluixi.config.ts', `export default { env: { public: ['API_URL', 'AUTH_ISSUER', 'PAGE_SIZE'] } };\n`);
    generate('env', undefined);

    const text = read('src/config/env.ts');
    expect(text).toContain(`  apiUrl: 'API_URL',\n  pageSize: 'PAGE_SIZE',\n});`);
    expect(text).not.toContain('AUTH_ISSUER');
  });
});

describe('generate auth', () => {
  it('puts the better-auth route under src/api, importing the config from there', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('auth', undefined);

    expect(read('src/api/auth/[...all].ts')).toContain(`import '../../auth.config.js';`);
    expect(existsSync(join(dir, 'src/routes/api'))).toBe(false);
  });

  it('wires oauth2 in browser mode, adding to env.public and .env.example once', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    put('fluixi.config.ts', `export default {\n  env: {\n    public: [\n      'API_URL',\n    ],\n  },\n};\n`);
    put('.env.example', 'VITE_AUTH_CLIENT_ID=app\n');
    put('src/config/env.ts', `import { pickEnv } from '@fluixi/start/env';\n\nexport const config = pickEnv({ apiUrl: 'API_URL' });\n`);
    process.argv = ['node', 'fluixi', 'generate', 'auth', 'oauth2', '--provider', 'keycloak'];
    generate('auth', 'oauth2');

    expect(read('src/config/env.ts')).toContain(
      `import { pickEnv } from '@fluixi/start/env';\nimport { publicEnv } from '@fluixi/start/env';\nimport { authFromEnv } from '@fluixi/oauth2/env';\n`,
    );
    expect(read('src/config/env.ts')).toMatch(/export const auth = authFromEnv\(publicEnv\(\), \{ clientPrefix: '' \}\);\n$/);
    expect(read('src/services/auth.ts')).toContain(`tokens: 'browser'`);
    expect(read('src/app.config.ts')).toContain('imports: [AuthModule]');
    expect(existsSync(join(dir, 'src/routes/callback.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'src/routes/login.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'src/services/auth.server.ts'))).toBe(false);
    expect(read('fluixi.config.ts')).toContain(`      'API_URL',\n      'AUTH_PROVIDER',\n      'AUTH_CLIENT_ID',`);
    const example = read('.env.example');
    expect(example).toContain('AUTH_PROVIDER=keycloak\nAUTH_TOKENS=browser\nAUTH_BASE_URL=');
    expect(example).not.toMatch(/^AUTH_CLIENT_ID=/m);
  });

  it('keeps the tokens on the server for a provider that refuses a public client', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    process.argv = ['node', 'fluixi', 'generate', 'auth', 'oauth2', '--provider=google'];
    generate('auth', 'oauth2');

    expect(read('src/services/auth.ts')).toContain(`tokens: 'server'`);
    expect(read('src/app.config.server.ts')).toContain(`import { authServer } from './services/auth.server.js';`);
    expect(read('src/app.config.server.ts')).toContain('imports: [authServer()]');
    expect(existsSync(join(dir, 'src/routes/callback.tsx'))).toBe(false);
    expect(read('.env.example')).toMatch(/^SESSION_SECRET=$/m);
  });
});
