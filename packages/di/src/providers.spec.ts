import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { injectionToken, inject, provide, createInjector } from './index.js';
import { createTestInjector, resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: providers', () => {
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
      expect(inject(D)).toBe(inject(C));
    });
  });

  it('a token factory provides itself at the root, once', () => {
    createRoot(() => {
      let built = 0;
      const Logger = injectionToken('Logger', { factory: () => ({ id: ++built }) });
      expect(inject(Logger)).toBe(inject(Logger));
      expect(built).toBe(1);
    });
  });

  it('multi providers collect every contribution, in order; a child injector has its own list', () => {
    const Plugins = injectionToken<string[]>('Plugins');
    const root = createTestInjector({
      providers: [
        { provide: Plugins as never, useValue: 'a', multi: true },
        { provide: Plugins as never, useFactory: () => 'b', multi: true },
      ],
    });
    expect(root.get(Plugins)).toEqual(['a', 'b']);
    const child = createInjector([{ provide: Plugins as never, useValue: 'c', multi: true }], root);
    expect(child.get(Plugins)).toEqual(['c']);
  });

  it('what a class injects in its constructor resolves from the injector that provides it', () => {
    const Config = injectionToken<string>('Config');
    class Service {
      config = inject(Config);
    }
    const S = injectionToken<Service>('Service');
    const parent = createTestInjector({
      providers: [
        { provide: Config, useValue: 'parent' },
        { provide: S, useClass: Service },
      ],
    });
    const child = createInjector([{ provide: Config, useValue: 'child' }], parent);
    expect(child.get(S).config).toBe('parent');
  });
});
