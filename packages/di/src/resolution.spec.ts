import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { injectionToken, inject, provide, createInjector, InjectionError } from './index.js';
import { createTestInjector, resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: resolution options', () => {
  const T = injectionToken<string>('T');

  it('optional answers null where nothing provides the token', () => {
    const inj = createTestInjector();
    expect(inj.get(T, { optional: true })).toBeNull();
    expect(() => inj.get(T)).toThrow(InjectionError);
  });

  it('self looks only in the injector asked; skipSelf starts with its parent', () => {
    const parent = createTestInjector({ providers: [{ provide: T, useValue: 'parent' }] });
    const child = createInjector([{ provide: T, useValue: 'child' }], parent);
    const empty = createInjector([], parent);
    expect(child.get(T, { self: true })).toBe('child');
    expect(empty.get(T, { self: true, optional: true })).toBeNull();
    expect(child.get(T, { skipSelf: true })).toBe('parent');
  });

  it('host stops at the nearest component injector', () => {
    createRoot(() => {
      provide([{ provide: T, useValue: 'outer component' }]);
      createRoot(() => {
        provide([]);
        expect(inject(T, { host: true, optional: true })).toBeNull();
        expect(inject(T)).toBe('outer component');
      });
    });
  });
});
