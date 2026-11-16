import { describe, it, expect, afterEach, vi } from 'vitest';
import { prepareRender } from '@fluixi/dom';
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

  it('warns about an initializer registered once the app has started rendering', async () => {
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => {});
    provideRoot([provideAppInitializer(() => {})]);
    expect(warned).not.toHaveBeenCalled();
    await prepareRender();
    // As from a module a route imports while the page renders.
    provideRoot([provideAppInitializer(() => {})]);
    expect(warned).toHaveBeenCalledWith(expect.stringMatching(/registered after the app started rendering/));
    warned.mockRestore();
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
