import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequestContext, runWithRequestContext, setRequestStore } from '@fluixi/dom';
import { getInjector, inject, injectionToken, isInInjectionContext, provide, provideRoot, runInInjectionContext } from './index.js';
import { resetInjection } from './testing.js';

afterEach(() => resetInjection());

const Cfg = injectionToken<string>('Cfg');

describe('@fluixi/di: outside an injection context', () => {
  it('throws after an await in a component, instead of answering with the root instance', async () => {
    provideRoot([{ provide: Cfg, useValue: 'root value' }]);
    let before: string | undefined;
    let after: unknown;
    let inContext: boolean | undefined;
    let kept: string | undefined;
    await new Promise<void>((done) => {
      createRoot(() => {
        provide([{ provide: Cfg, useValue: 'component override' }]);
        before = inject(Cfg);
        const injector = getInjector();
        void (async () => {
          await Promise.resolve();
          inContext = isInInjectionContext();
          try {
            after = inject(Cfg);
          } catch (error) {
            after = error;
          }
          // The way the error message points to: the injector kept from setup.
          kept = runInInjectionContext(injector, () => inject(Cfg));
          done();
        })();
      });
    });
    expect(before).toBe('component override');
    expect(inContext).toBe(false);
    expect(after).toBeInstanceOf(Error);
    expect(String(after)).toMatch(/outside an injection context/);
    expect(kept).toBe('component override');
  });

  it('still resolves from the root during a server request, which is its context', async () => {
    // As @fluixi/server installs it: the request survives an await.
    setRequestStore(new AsyncLocalStorage());
    try {
      provideRoot([{ provide: Cfg, useValue: 'request root' }]);
      const value = await runWithRequestContext(createRequestContext(), async () => {
        await Promise.resolve();
        return inject(Cfg);
      });
      expect(value).toBe('request root');
    } finally {
      setRequestStore(null);
    }
  });
});
