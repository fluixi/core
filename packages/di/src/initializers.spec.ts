import { describe, it, expect, afterEach } from 'vitest';
import { inject, injectionToken, provideRoot, provideAppInitializer, runAppInitializers, runInInjectionContext, createInjector, isInInjectionContext, assertInInjectionContext, INJECTOR } from './index.js';
import { resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: app initializers and context', () => {
  it('runs every initializer in order, waiting for each', async () => {
    const ran: string[] = [];
    provideRoot([
      provideAppInitializer(async () => {
        await new Promise((r) => setTimeout(r, 5));
        ran.push('slow first');
      }),
      provideAppInitializer(() => ran.push('second')),
    ]);
    await runAppInitializers();
    expect(ran).toEqual(['slow first', 'second']);
  });

  it('runs each initializer in the root injection context, so it may inject', async () => {
    const Settings = injectionToken<{ loaded: boolean; load(): Promise<void> }>('Settings');
    const settings = { loaded: false, load: async () => void (settings.loaded = true) };
    provideRoot([
      { provide: Settings, useValue: settings },
      provideAppInitializer(async () => {
        await inject(Settings).load();
      }),
    ]);
    await runAppInitializers();
    expect(settings.loaded).toBe(true);
  });

  it('knows whether inject() can run, and resolves INJECTOR to the current injector', () => {
    expect(isInInjectionContext()).toBe(false);
    expect(() => assertInInjectionContext('useThing')).toThrow(/useThing\(\)/);
    const inj = createInjector([], null);
    runInInjectionContext(inj, () => {
      expect(isInInjectionContext()).toBe(true);
      expect(inject(INJECTOR)).toBe(inj);
    });
  });
});
