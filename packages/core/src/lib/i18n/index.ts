/**
 * @fluixi/core/i18n: built-in, reactive, SSR-correct internationalization.
 *
 * Three things make this distinct:
 *
 *  1. **SSR request-scoped locale.** The active locale is per-request on the server (kept in the
 *     RequestContext) and a reactive module signal on the client. Two concurrent SSR requests in
 *     different languages never bleed, and the server-resolved locale is seeded to the client
 *     (no flash, no hydration mismatch).
 *
 *  2. **No reactive-owner-context dependency.** `t()` reads the locale from the request context /
 *     module signal, not `useContext`, so it resolves in lazy routes, server functions, loaders,
 *     anywhere. (This is precisely why it sidesteps the classic "useLocale() is undefined under
 *     SSR on a lazy route" failure: there's no provider owner-chain to lose.)
 *
 *  3. **Platform-native formatting.** Pluralization via `Intl.PluralRules`, numbers/dates via
 *     `Intl.NumberFormat`/`Intl.DateTimeFormat`: correct CLDR rules, zero dependencies.
 *
 *     const i18n = createI18n({ locale: 'en', locales: ['en', 'fr'] as const, messages: { en, fr } });
 *     export const { t, n, d, locale, setLocale } = i18n;
 *
 *     t('welcome', { name: 'Ada' })   // "Welcome, Ada"
 *     t('cart.items', { count: 3 })   // plural branch via Intl.PluralRules
 *     n(1234.5);  d(new Date());      // locale-aware number/date
 *     setLocale('fr');                // reactive, every t() re-evaluates
 */
import { createSignal, type Accessor } from '@fluixi/reactive/signal';
import { getRequestContext, getServerData } from '@fluixi/dom';

/** A leaf message: a plain string, or a plural map keyed by CLDR category (`one`/`other`/...). */
export type MessageValue = string | { readonly [pluralCategory: string]: string };
/** A (possibly nested) message tree. */
export interface Messages {
  readonly [key: string]: MessageValue | Messages;
}

/** CLDR plural categories. An object keyed *only* by these is a plural leaf, not a subtree. */
type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * The union of every valid translation key in `M`: `t()` autocompletes these and flags typos.
 * Flat keys (`'welcome'`, `'nav.dashboard'`), nested trees (`'cart.items'`, `'nested.deep.key'`),
 * and plural maps (`{ one, other }` -> a leaf) all work. Only *leaf* paths are emitted, never the
 * intermediate branch (`'nav'`, `'cart'`). Falls open to `string` when `M` is just `Messages`.
 *
 * A subtree and a plural map are both `Record<string, string>` structurally, so the plural leaf is
 * detected by its keys being CLDR categories, not by "all children are strings" (which wrongly
 * truncated `nav: { dashboard, settings }` to `'nav'`).
 */
export type MessageKey<M> = M extends object
  ? {
      [K in keyof M & string]: M[K] extends string
        ? K // string leaf
        : [keyof M[K]] extends [PluralCategory]
          ? K // plural leaf (keys are CLDR categories)
          : M[K] extends object
            ? `${K}.${MessageKey<M[K]>}` // recurse: leaf paths only, not the branch key
            : K;
    }[keyof M & string]
  : string;

export interface I18nConfig<L extends string, M extends Record<L, Messages> = Record<L, Messages>> {
  /** Default / fallback locale. */
  locale: L;
  /** Supported locales. */
  locales: readonly L[];
  /** Messages per locale (nested; a leaf is a string or a plural map). Keys are inferred for `t`. */
  messages: M;
  /** Persist the chosen locale on the client. Default: a year-long `locale` cookie. */
  persist?: (locale: L) => void;
}

export interface I18n<L extends string, K extends string = string> {
  /** Translate a key (autocompleted from your messages) with optional params; `count` pluralizes. */
  t: (key: K | (string & {}), params?: Record<string, unknown>) => string;
  /** Format a number for the active locale (`Intl.NumberFormat`). */
  n: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Format a date for the active locale (`Intl.DateTimeFormat`). */
  d: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  /** The active locale: reactive on the client, per-request on the server. */
  locale: Accessor<L>;
  /** Switch the active locale (client: reactive + persisted; server: this request only). */
  setLocale: (locale: L) => void;
  /** Supported locales. */
  locales: readonly L[];
}

const SEED_KEY = '__i18n:locale';
const IS_SERVER = typeof document === 'undefined';

function readSeed<L>(): L | undefined {
  if (IS_SERVER) return undefined;
  const data = getServerData();
  return data ? (data[SEED_KEY] as L | undefined) : undefined;
}

function cookiePersist(locale: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `locale=${locale};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* private mode / disabled: best effort */
  }
}

/**
 * Translations, with the message keys inferred from the messages themselves.
 *
 * `t()` accepts only leaf paths that exist in the catalogue, so a typo is a type error
 * rather than a string echoed back at a visitor. A missing key at runtime returns the key,
 * which is visible in the page and traceable.
 *
 * The locale is per request on the server and reactive on the client, seeded from what the
 * server resolved so hydration cannot disagree about the language. Persistence is a cookie
 * by default, which is the only store a server render can read.
 *
 * @example
 * ```ts
 * const i18n = createI18n({
 *   locale: 'en',
 *   messages: { en: { hi: 'Hello' }, fr: { hi: 'Bonjour' } },
 * });
 * i18n.t('hi');        // 'Hello'
 * i18n.setLocale('fr');
 * ```
 */
export function createI18n<L extends string, const M extends Record<L, Messages>>(
  config: I18nConfig<L, M>,
): I18n<L, MessageKey<M[keyof M]>> {
  const persist = config.persist ?? cookiePersist;
  // Client: a reactive signal seeded from the server-resolved locale (so hydration matches).
  const [clientLocale, setClientLocale] = createSignal<L>(readSeed<L>() ?? config.locale);

  const serverCtx = (): { __i18nLocale?: L; data?: Map<string, unknown> } | undefined =>
    IS_SERVER ? (getRequestContext() as never) : undefined;

  function locale(): L {
    const ctx = serverCtx();
    if (ctx) return ctx.__i18nLocale ?? config.locale; // server: per-request, no shared signal -> no leak
    return clientLocale(); // client: reactive
  }

  function setLocale(next: L): void {
    const ctx = serverCtx();
    if (ctx) {
      ctx.__i18nLocale = next;
      ctx.data?.set?.(SEED_KEY, next); // serialize -> client hydrates in the same language
      return;
    }
    setClientLocale(() => next);
    persist(next);
  }

  function resolve(loc: L, key: string): MessageValue | undefined {
    const bundle = config.messages[loc] as Record<string, unknown> | undefined;
    if (bundle == null) return undefined;
    // Flat key first: supports dotted flat keys like `nav.dashboard` (not just nested trees).
    const flat = bundle[key];
    if (flat !== undefined) return flat as MessageValue;
    // Else walk the dot-path through a nested message tree.
    let node: unknown = bundle;
    for (const part of key.split('.')) {
      if (node == null || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[part];
    }
    return node as MessageValue | undefined;
  }

  function interpolate(str: string, params?: Record<string, unknown>): string {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_m, k: string) => (k in params ? String(params[k]) : `{${k}}`));
  }

  function t(key: string, params?: Record<string, unknown>): string {
    const loc = locale();
    let msg = resolve(loc, key);
    if (msg === undefined && loc !== config.locale) msg = resolve(config.locale, key); // fallback locale
    if (msg === undefined) return key; // missing -> echo the key (visible, debuggable)
    if (typeof msg !== 'string') {
      const count = Number(params?.count ?? 0);
      const category = new Intl.PluralRules(loc).select(count);
      const branch = msg[category] ?? msg.other ?? Object.values(msg)[0] ?? '';
      return interpolate(branch, params);
    }
    return interpolate(msg, params);
  }

  const n = (value: number, options?: Intl.NumberFormatOptions): string =>
    new Intl.NumberFormat(locale(), options).format(value);
  const d = (value: Date | number, options?: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(locale(), options).format(value);

  return { t, n, d, locale, setLocale, locales: config.locales };
}

/** Pick the best supported locale from an `Accept-Language` header, else `undefined`. */
export function detectLocale<L extends string>(
  acceptLanguage: string | null | undefined,
  locales: readonly L[],
): L | undefined {
  if (!acceptLanguage) return undefined;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    const hit = locales.find((l) => l.toLowerCase() === tag || l.toLowerCase() === base);
    if (hit) return hit;
  }
  return undefined;
}
