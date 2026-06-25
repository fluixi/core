// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/core';
import { createRequestContext, runWithRequestContext } from '@fluixi/dom';
import {
  injectionToken,
  inject,
  provide,
  runInInjectionContext,
  createInjector,
} from './di.js';

describe('@fluixi/start/di', () => {
  it('resolves useValue / useFactory / useClass / useExisting', () => {
    createRoot(() => {
      const A = injectionToken<number>('A');
      const B = injectionToken<{ a: number }>('B');
      class Svc {
        constructor(public a: number) {}
      }
      const C = injectionToken<Svc>('C');
      const D = injectionToken<Svc>('D');
      provide([
        { provide: A, useValue: 7 },
        { provide: B, useFactory: (a: number) => ({ a }), deps: [A] },
        { provide: C, useClass: Svc, deps: [A] },
        { provide: D, useExisting: C },
      ]);
      expect(inject(A)).toBe(7);
      expect(inject(B)).toEqual({ a: 7 });
      expect(inject(C)).toBeInstanceOf(Svc);
      expect(inject(C).a).toBe(7);
      expect(inject(D)).toBe(inject(C)); // useExisting → same instance
    });
  });

  it('a token factory self-provides at the root (providedIn: root), as a singleton', () => {
    createRoot(() => {
      let built = 0;
      const Logger = injectionToken('Logger', {
        factory: () => {
          built++;
          return { id: 1 };
        },
      });
      const a = inject(Logger);
      const b = inject(Logger);
      expect(a).toBe(b);
      expect(built).toBe(1);
    });
  });

  it('child scope overrides parent; the parent is unaffected (hierarchical)', () => {
    createRoot(() => {
      const T = injectionToken<string>('T');
      provide([{ provide: T, useValue: 'root' }]);
      expect(inject(T)).toBe('root');
      createRoot(() => {
        provide([{ provide: T, useValue: 'child' }]);
        expect(inject(T)).toBe('child');
      });
      expect(inject(T)).toBe('root');
    });
  });

  it('runs onDestroy when an owner-scoped injector disposes', () => {
    let destroyed = false;
    createRoot((dispose) => {
      const S = injectionToken<{ onDestroy(): void }>('S');
      provide([{ provide: S, useFactory: () => ({ onDestroy: () => (destroyed = true) }) }]);
      inject(S);
      dispose();
    });
    expect(destroyed).toBe(true);
  });

  it('SSR isolation: a root service is a FRESH instance per request (no cross-request leak)', () => {
    const Counter = injectionToken('Counter', { factory: () => ({ n: 0 }) });
    const seen: Array<{ n: number }> = [];
    for (let req = 0; req < 2; req++) {
      runWithRequestContext(createRequestContext(), () => {
        const c = inject(Counter); // resolves at the per-request root injector
        c.n++;
        seen.push(c);
      });
    }
    expect(seen[0]).not.toBe(seen[1]); // different instances
    expect(seen[0].n).toBe(1);
    expect(seen[1].n).toBe(1); // request 2 did not see request 1's mutation
  });

  it('runInInjectionContext resolves from an explicit injector (e.g. inside a server function)', () => {
    const T = injectionToken<string>('T');
    const inj = createInjector([{ provide: T, useValue: 'explicit' }], null);
    expect(runInInjectionContext(inj, () => inject(T))).toBe('explicit');
  });
});
