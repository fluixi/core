import { describe, it, expect, afterEach } from 'vitest';
import { injectionToken } from './index.js';
import { createTestInjector, resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: testing', () => {
  it('an override replaces a provider and a self-providing token until reset', () => {
    const Clock = injectionToken('Clock', { factory: () => ({ now: () => 1 }) });
    const Api = injectionToken<string>('Api');
    const inj = createTestInjector({
      providers: [{ provide: Api, useValue: 'real' }],
      overrides: [
        { provide: Api, useValue: 'fake' },
        { provide: Clock, useValue: { now: () => 42 } },
      ],
    });
    expect(inj.get(Api)).toBe('fake');
    expect(inj.get(Clock).now()).toBe(42);
    resetInjection();
    expect(createTestInjector({ providers: [{ provide: Api, useValue: 'real' }] }).get(Api)).toBe('real');
  });
});
