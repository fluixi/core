/**
 * `fluixi generate <kind> <name>` (alias `g`) — scaffold a piece into the current app.
 *   fluixi g component Button        → src/components/Button.tsx
 *   fluixi g route about             → src/routes/about.tsx  (a file route)
 *   fluixi g route blog/[id]         → src/routes/blog/[id].tsx
 *   fluixi g middleware              → src/middleware.ts
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, basename } from 'node:path';
import { c } from '@fluixi/start/ui';

const GEN_USAGE = `Usage: fluixi generate <kind> <name>

Kinds:
  component <Name>      a reusable component        → src/components/<Name>.tsx
  route <path>          a file-based route page     → src/routes/<path>.tsx
  middleware            the request middleware file → src/middleware.ts
  auth                  @fluixi/auth wiring         → auth.config + auth.client + middleware + /api/auth route
`;

function pascal(s: string): string {
  return s
    .replace(/\[(.+?)\]/g, '$1') // drop dynamic-segment brackets
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('') || 'Component';
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
  `export function ${Name}() {
  return <div class="${Name.toLowerCase()}">${Name}</div>;
}
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
import '../../../auth.config.js';

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
      write(resolve('src/components', `${Name}.tsx`), component(Name));
      break;
    }
    case 'route':
    case 'r': {
      if (!name) return fail('route path required, e.g. `fluixi g route about`');
      write(resolve('src/routes', `${name}.tsx`), route(pascal(basename(name))));
      break;
    }
    case 'middleware':
    case 'm':
      write(resolve('src/middleware.ts'), middleware());
      break;
    case 'auth':
      write(resolve('src/auth.config.ts'), authConfig());
      write(resolve('src/auth.client.ts'), authClient());
      write(resolve('src/middleware.ts'), authMiddleware());
      write(resolve('src/routes/api/auth/[...all].ts'), authRoute());
      console.log(`  ${c.gray('next: install')} ${c.cyan('better-auth')}${c.gray(', set your DB adapter in auth.config.ts, and forward `request` in entry-server')}`);
      break;
    default:
      console.error(GEN_USAGE);
      process.exit(1);
  }
}

function fail(msg: string): void {
  console.error(`  ${c.red('✗')} ${msg}`);
  process.exit(1);
}
