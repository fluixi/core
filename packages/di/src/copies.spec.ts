import { describe, it, expect, afterEach } from 'vitest';
import { Injector } from './index.js';
import { resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: one state across module copies', () => {
  it('a provider registered through one copy is found through another', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const a = await import('./index.js');
    vi.resetModules();
    const b = await import('./index.js');
    const T = a.injectionToken<string>('T');
    a.provideRoot([{ provide: T, useValue: 'shared' }]);
    expect(b.inject(T)).toBe('shared');
    expect(b.Injector).not.toBe(Injector);
  });
});
