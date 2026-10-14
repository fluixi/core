import { describe, it, expect, afterEach } from 'vitest';
import { injectionToken, inject } from './index.js';
import { createTestInjector, resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: errors', () => {
  it('a missing provider names the whole path that led to it', () => {
    const C = injectionToken<string>('C');
    const B = injectionToken<string>('B');
    const A = injectionToken<string>('A');
    const inj = createTestInjector({
      providers: [
        { provide: A, useFactory: (b: string) => b, deps: [B] },
        { provide: B, useFactory: (c: string) => c, deps: [C] },
      ],
    });
    expect(() => inj.get(A)).toThrow(/A → B → C/);
  });

  it('a cycle names its members', () => {
    const A = injectionToken<unknown>('A');
    const B = injectionToken<unknown>('B');
    const inj = createTestInjector({
      providers: [
        { provide: A, useFactory: () => inject(B) },
        { provide: B, useFactory: () => inject(A) },
      ],
    });
    expect(() => inj.get(A)).toThrow(/Circular dependency: A → B → A/);
  });
});
