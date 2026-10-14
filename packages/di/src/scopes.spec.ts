// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { createRequestContext, runWithRequestContext, renderToStringAsync, createNativeElement, insert } from '@fluixi/dom';
import { injectionToken, inject, providePlatform } from './index.js';
import { resetInjection } from './testing.js';

afterEach(() => resetInjection());

describe('@fluixi/di: scopes', () => {
  it('a root service is a fresh instance per request', () => {
    const Counter = injectionToken('Counter', { factory: () => ({ n: 0 }) });
    const seen: Array<{ n: number }> = [];
    for (let req = 0; req < 2; req++) {
      runWithRequestContext(createRequestContext(), () => {
        const c = inject(Counter);
        c.n++;
        seen.push(c);
      });
    }
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen.map((c) => c.n)).toEqual([1, 1]);
  });

  it('a platform service is shared by every request', () => {
    const Pool = injectionToken('Pool', { factory: () => ({}), scope: 'platform' });
    const Settings = injectionToken<{ env: string }>('Settings');
    providePlatform([{ provide: Settings, useValue: { env: 'prod' } }]);
    const seen = [0, 1].map(() => runWithRequestContext(createRequestContext(), () => [inject(Pool), inject(Settings)]));
    expect(seen[0][0]).toBe(seen[1][0]);
    expect(seen[0][1]).toBe(seen[1][1]);
  });

  it('a request-scoped service is injected during a server render, isolated per request', async () => {
    const Region = injectionToken<{ id: string }>('Region', { factory: () => ({ id: '' }) });
    const Badge = () => {
      const region = inject(Region);
      const el = createNativeElement('span') as any;
      insert(el, () => `region:${region.id}`);
      return el;
    };
    const a = await renderToStringAsync(() => {
      inject(Region).id = 'us';
      return Badge();
    });
    const b = await renderToStringAsync(() => {
      inject(Region).id = 'fr';
      return Badge();
    });
    expect(a).toContain('region:us');
    expect(b).toContain('region:fr');
  });
});
