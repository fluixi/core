import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createRequestContext, runWithRequestContext, endRequestContext } from '@fluixi/dom';
import { injectionToken, inject, provide, DestroyRef } from './index.js';
import { createTestInjector, resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: lifecycle', () => {
  it('destroy hooks run latest first, then onDestroy(); an unregistered hook does not run', () => {
    const ran: string[] = [];
    const S = injectionToken<{ onDestroy(): void }>('S');
    const inj = createTestInjector({
      providers: [
        {
          provide: S,
          useFactory: () => {
            const ref = inject(DestroyRef);
            ref.onDestroy(() => ran.push('hook 1'));
            const off = ref.onDestroy(() => ran.push('removed'));
            ref.onDestroy(() => ran.push('hook 2'));
            off();
            return { onDestroy: () => ran.push('onDestroy') };
          },
        },
      ],
    });
    inj.get(S);
    inj.dispose();
    expect(ran).toEqual(['hook 2', 'hook 1', 'onDestroy']);
    expect(inj.destroyRef.destroyed).toBe(true);
  });

  it('runs onDestroy when a component injector is disposed', () => {
    let destroyed = false;
    createRoot((dispose) => {
      const S = injectionToken<{ onDestroy(): void }>('S');
      provide([{ provide: S, useFactory: () => ({ onDestroy: () => (destroyed = true) }) }]);
      inject(S);
      dispose();
    });
    expect(destroyed).toBe(true);
  });

  it("disposes a request's root injector when the request ends", () => {
    let destroyed = 0;
    const S = injectionToken('S', { factory: () => ({ onDestroy: () => destroyed++ }) });
    const ctx = createRequestContext();
    runWithRequestContext(ctx, () => inject(S));
    expect(destroyed).toBe(0);
    endRequestContext(ctx);
    expect(destroyed).toBe(1);
  });
});
