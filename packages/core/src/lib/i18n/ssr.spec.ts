// @vitest-environment node
// In node (no `document`), createI18n takes the SERVER path: the locale lives in the
// per-request RequestContext, not a shared signal — so concurrent requests can't bleed.
import { describe, it, expect } from 'vitest';
import { createRequestContext, runWithRequestContext } from '@fluixi/dom';
import { createI18n } from './index.js';

const messages = { en: { hi: 'Hello' }, fr: { hi: 'Bonjour' } };

describe('@fluixi/core/i18n — SSR request isolation', () => {
  it('the active locale is per-request on the server (no cross-request leak)', () => {
    const i = createI18n({ locale: 'en', locales: ['en', 'fr'] as const, messages });
    const out: string[] = [];

    // Two independent requests in different languages.
    runWithRequestContext(createRequestContext(), () => {
      i.setLocale('fr');
      out.push(i.t('hi'));
    });
    runWithRequestContext(createRequestContext(), () => {
      i.setLocale('en');
      out.push(i.t('hi'));
    });

    expect(out).toEqual(['Bonjour', 'Hello']); // request 2 never saw request 1's locale
    expect(i.t('hi')).toBe('Hello'); // outside any request → default
  });

  it('serializes the resolved locale for the client (seed → no hydration mismatch)', () => {
    const i = createI18n({ locale: 'en', locales: ['en', 'fr'] as const, messages });
    const ctx = createRequestContext();
    runWithRequestContext(ctx, () => i.setLocale('fr'));
    expect(ctx.data.get('__i18n:locale')).toBe('fr'); // lands in __FX_DATA__ for the client to seed
  });
});
