/**
 * What modules and DI tell a watching devtools: a scope per module, nested along imports, and
 * a scope per service under the module that provides it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  observeReactiveNodes,
  openReactiveScope,
  markReactiveScope,
  signal,
  withReactiveScope,
  type ReactiveScopeInfo,
} from '@fluixi/reactive/signal';
import { collectApp, defineApp, defineModule } from './app.js';
import { createInjector, injectionToken } from './di.js';

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
});

function watch() {
  const scopes = new Map<object, { info: ReactiveScopeInfo; parent?: object }>();
  const nodes: Array<{ name?: string; scope?: object }> = [];
  stop = observeReactiveNodes({
    created: (r) => nodes.push({ name: r.name, scope: r.scope }),
    scope: (scope, info, parent) => scopes.set(scope, { info, parent }),
    scopeAdopted: (scope, parent) => {
      const entry = scopes.get(scope);
      if (entry) entry.parent = parent;
    },
  });
  const byName = (name: string) => [...scopes].find(([, v]) => v.info.name === name)?.[0];
  return { scopes, nodes, byName };
}

describe('modules and services under devtools', () => {
  it('nests modules along imports, and builds a service inside its module', () => {
    const seen = watch();
    class Mailer {
      queued = signal(0, { name: 'queued' });
    }
    const MailerToken = injectionToken<Mailer>('Mailer');
    const MailModule = defineModule({ name: 'MailModule', providers: [{ provide: MailerToken, useClass: Mailer }] });
    const AppShell = defineModule({ name: 'Shell', imports: [MailModule] });
    const app = collectApp([defineApp({ imports: [AppShell] })]);

    createInjector(app.providers).get(MailerToken);

    const shell = seen.byName('Shell')!;
    const mail = seen.byName('MailModule')!;
    const service = seen.byName('Mailer')!;
    expect(seen.scopes.get(mail)).toMatchObject({ info: { kind: 'module' }, parent: shell });
    expect(seen.scopes.get(service)).toMatchObject({ info: { kind: 'service', detail: 'useClass' }, parent: mail });
    expect(seen.nodes.find((n) => n.name === 'queued')?.scope).toBe(service);
  });

  it('adopts a marked value under the module that provides it, at registration', () => {
    const seen = watch();
    // As a package does for an instance it builds at import time.
    const own = openReactiveScope({ kind: 'service', name: 'AuthService' });
    const auth = withReactiveScope(own, () => ({ user: signal<string | null>(null, { name: 'user' }) }));
    markReactiveScope(auth, own);
    const AuthToken = injectionToken<typeof auth>('Auth');
    const AuthModule = defineModule({ name: 'AuthModule', providers: [{ provide: AuthToken, useValue: auth }] });
    // Registration alone places it: nothing has to inject the token first.
    const app = collectApp([defineApp({ imports: [AuthModule] })]);
    expect(seen.scopes.get(own)?.parent).toBe(seen.byName('AuthModule'));
    expect(createInjector(app.providers).get(AuthToken)).toBe(auth);
    expect(seen.nodes.find((n) => n.name === 'user')?.scope).toBe(own);
  });
});
