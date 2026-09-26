import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectApp, defineApp, defineModule } from './app.js';
import { appConfigVitePlugin, appModuleSource, APP_MIDDLEWARE_EXPORT, APP_VMOD } from './app-plugin.js';
import { createHandlerFrom } from './handler-core.js';
import { injectionToken, type Provider } from './di.js';
import type { Middleware } from './middleware.js';

const T = injectionToken<string>('T');
const value = (v: string): Provider => ({ provide: T, useValue: v });
const tag =
  (name: string, log: string[]): Middleware =>
  (_req, next) => {
    log.push(name);
    return next();
  };

describe('collectApp', () => {
  it('registers dependencies first and each module once', () => {
    const Http = defineModule({ name: 'http', providers: [value('http')] });
    const Auth = defineModule({ name: 'auth', imports: [Http], providers: [value('auth')] });
    const Admin = defineModule({ name: 'admin', imports: [Http, Auth] });
    const app = collectApp([defineApp({ imports: [Auth, Admin] })]);
    expect(app.modules).toEqual(['http', 'auth', 'admin', 'app']);
    expect(app.providers.map((p) => (p as any).useValue)).toEqual(['http', 'auth']);
  });

  it("puts the app's own providers last, so they override a module's", () => {
    const Auth = defineModule({ name: 'auth', providers: [value('module')] });
    const app = collectApp([defineApp({ imports: [Auth], providers: [value('app')] })]);
    expect(app.providers.map((p) => (p as any).useValue)).toEqual(['module', 'app']);
  });

  it('reads the default export off a module namespace, and skips a missing file', () => {
    const app = collectApp([{ default: defineApp({ providers: [value('x')] }) }, undefined, {}]);
    expect(app.providers).toHaveLength(1);
  });

  it('collects middleware in order and names the modules carrying it', () => {
    const log: string[] = [];
    const A = defineModule({ name: 'a', middleware: [tag('a', log)] });
    const B = defineModule({ name: 'b' });
    const app = collectApp([defineApp({ imports: [A, B], middleware: [tag('app', log)] })]);
    expect(app.middleware).toHaveLength(2);
    expect(app.withMiddleware).toEqual(['a', 'app']);
  });

  it('refuses a cycle and names it', () => {
    // defineModule freezes, so a cycle can only come from a module assembled by hand.
    const a: any = { ...defineModule({ name: 'a' }), imports: [] };
    const b: any = { ...defineModule({ name: 'b' }), imports: [a] };
    a.imports.push(b);
    expect(() => collectApp([defineApp({ imports: [a] })])).toThrow(/cycle: a → b → a/);
  });

  it('refuses something that is not a module', () => {
    expect(() => collectApp([defineApp({ imports: [{ name: 'plain' } as any] })])).toThrow(/defineModule/);
  });
});

describe('virtual:fluixi-app source', () => {
  const files = { shared: '/app/src/app.config.ts', server: '/app/src/app.config.server.ts' };

  it('never imports the server config into the client', () => {
    const client = appModuleSource(files, false);
    expect(client).toContain('/app/src/app.config.ts');
    expect(client).not.toContain(files.server);
    expect(client).toContain('export const middleware = [];');
  });

  it('imports both on the server and exports the middleware', () => {
    const server = appModuleSource(files, true);
    expect(server).toContain('/app/src/app.config.server.ts');
    expect(server).toContain('export const middleware = app.middleware;');
  });
});

describe('entry transform', () => {
  let root: string;
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const setup = (withConfig: boolean) => {
    root = mkdtempSync(join(tmpdir(), 'fluixi-app-'));
    mkdirSync(join(root, 'src'));
    if (withConfig) writeFileSync(join(root, 'src/app.config.ts'), 'export default {}');
    return appConfigVitePlugin({ root, clientEntry: 'src/entry-client.ts', serverEntry: 'src/entry-server.ts' });
  };
  const entry = "import './a.css';\nstart();\n";

  it('leaves an app without a config untouched', () => {
    const plugin = setup(false);
    expect(plugin.transform(entry, join(root, 'src/entry-client.tsx'), {})).toBeNull();
  });

  it('imports the app module on line 1 of the client entry, whatever its extension', () => {
    const plugin = setup(true);
    const out = plugin.transform(entry, join(root, 'src/entry-client.tsx'), {});
    expect(out.code.startsWith(`import '${APP_VMOD}';import './a.css';`)).toBe(true);
    expect(out.code.split('\n')).toHaveLength(entry.split('\n').length);
    expect(out.code).not.toContain(APP_MIDDLEWARE_EXPORT);
  });

  it('re-exports the middleware from the server entry, on the server only', () => {
    const plugin = setup(true);
    const server = join(root, 'src/entry-server.ts');
    expect(plugin.transform(entry, server, { ssr: true }).code).toContain(APP_MIDDLEWARE_EXPORT);
    expect(plugin.transform(entry, server, {})).toBeNull();
    expect(plugin.transform(entry, join(root, 'src/entry-client.tsx'), { ssr: true })).toBeNull();
  });

  it('touches no other file', () => {
    const plugin = setup(true);
    expect(plugin.transform(entry, join(root, 'src/app.tsx'), {})).toBeNull();
  });
});

describe('createHandlerFrom', () => {
  it("runs module middleware ahead of src/middleware.ts", async () => {
    const log: string[] = [];
    const handler = createHandlerFrom({
      template: '<div id="root"></div>',
      mod: { render: () => 'x', [APP_MIDDLEWARE_EXPORT]: [tag('module', log)] } as any,
      cfg: { ssr: true, mountId: 'root' },
      middleware: { default: [tag('app', log)] },
    });
    const res = await handler(new Request('http://x/'));
    expect(res.status).toBe(200);
    expect(log).toEqual(['module', 'app']);
  });
});
