// @vitest-environment jsdom
import { describe, it, expect, expectTypeOf } from 'vitest';
import { createI18n, detectLocale, type MessageKey } from './index.js';

const messages = {
  en: {
    welcome: 'Welcome, {name}',
    cart: { items: { one: '{count} item', other: '{count} items' } },
    nested: { deep: { key: 'deep en' } },
  },
  fr: {
    welcome: 'Bienvenue, {name}',
    cart: { items: { one: '{count} article', other: '{count} articles' } },
  },
} as const;

const make = () => createI18n({ locale: 'en', locales: ['en', 'fr'] as const, messages });

describe('@fluixi/core/i18n', () => {
  it('translates with interpolation', () => {
    expect(make().t('welcome', { name: 'Ada' })).toBe('Welcome, Ada');
  });

  it('resolves nested dot-path keys', () => {
    expect(make().t('nested.deep.key')).toBe('deep en');
  });

  it('resolves a FLAT dotted key (e.g. "nav.dashboard") as well as nested trees', () => {
    const i = createI18n({
      locale: 'en',
      locales: ['en'] as const,
      messages: { en: { 'nav.dashboard': 'Dashboard' } },
    });
    expect(i.t('nav.dashboard')).toBe('Dashboard');
  });

  it('pluralizes via Intl.PluralRules', () => {
    const { t } = make();
    expect(t('cart.items', { count: 1 })).toBe('1 item');
    expect(t('cart.items', { count: 5 })).toBe('5 items');
  });

  it('echoes missing keys and falls back to the default locale', () => {
    const i = make();
    expect(i.t('does.not.exist')).toBe('does.not.exist');
    i.setLocale('fr');
    expect(i.t('nested.deep.key')).toBe('deep en'); // only in en → fallback
  });

  it('setLocale switches the active locale (reactive)', () => {
    const i = make();
    expect(i.t('welcome', { name: 'Ada' })).toBe('Welcome, Ada');
    i.setLocale('fr');
    expect(i.locale()).toBe('fr');
    expect(i.t('welcome', { name: 'Ada' })).toBe('Bienvenue, Ada');
    expect(i.t('cart.items', { count: 2 })).toBe('2 articles');
  });

  it('n/d format for the active locale (Intl)', () => {
    const i = make();
    expect(i.n(1234.5)).toBe(new Intl.NumberFormat('en').format(1234.5));
    i.setLocale('fr');
    expect(i.n(1234.5)).toBe(new Intl.NumberFormat('fr').format(1234.5));
  });

  it('detectLocale parses Accept-Language by quality', () => {
    expect(detectLocale('fr-FR,fr;q=0.9,en;q=0.8', ['en', 'fr'])).toBe('fr');
    expect(detectLocale('en-US', ['en', 'fr'])).toBe('en');
    expect(detectLocale('de-DE,de;q=0.9', ['en', 'fr'])).toBeUndefined();
  });

  it('infers translation keys for t() — leaf paths only (autocomplete)', () => {
    // MessageKey derives the leaf-key union: flat, plural leaves, and nested dot-paths —
    // but NOT intermediate branch keys (`cart`, `nested.deep`), which would render objects.
    type M = {
      welcome: string;
      'nav.dashboard': string; // flat dotted
      cart: { items: { one: string; other: string } };
      nested: { deep: { key: string } };
      // A subtree whose children are ALL strings must still recurse to each leaf —
      // NOT collapse to the branch key `settings` (regression: it looked like a plural map).
      settings: { theme: string; lang: string };
    };
    expectTypeOf<MessageKey<M>>().toEqualTypeOf<
      | 'welcome'
      | 'nav.dashboard'
      | 'cart.items'
      | 'nested.deep.key'
      | 'settings.theme'
      | 'settings.lang'
    >();

    // And t() accepts them (autocompleted at the call site).
    const i = make();
    i.t('welcome', { name: 'Ada' });
    i.t('cart.items', { count: 2 });
    i.t('nested.deep.key');
    expectTypeOf<'welcome'>().toMatchTypeOf<Parameters<typeof i.t>[0]>();
  });
});
