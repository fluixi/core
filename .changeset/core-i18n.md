---
"@fluixi/core": minor
---

Built-in i18n — `@fluixi/core/i18n`. Reactive, SSR-correct internationalization, no dependency.

```ts
import { createI18n } from '@fluixi/core/i18n';

const i18n = createI18n({ locale: 'en', locales: ['en', 'fr'] as const, messages: { en, fr } });
export const { t, n, d, locale, setLocale } = i18n;

t('welcome', { name: 'Ada' });   // interpolation
t('cart.items', { count: 3 });   // pluralization via Intl.PluralRules
n(1234.5);  d(new Date());        // locale-aware number/date (Intl)
setLocale('fr');                  // reactive — every t() re-evaluates
```

- **SSR request-scoped locale** — per-request on the server (kept in the RequestContext, not a
  shared signal, so two concurrent requests in different languages never bleed); a reactive
  module signal on the client; the server-resolved locale is serialized into `__FX_DATA__` for
  the client to seed (no flash, no hydration mismatch).
- **Resolves without the reactive owner-context chain** — `t()` reads the locale from the
  request context / module signal, NOT `useContext`, so it works in lazy routes, server
  functions, and loaders. (This is exactly why it sidesteps the "useLocale() undefined under SSR
  on a lazy route" failure — there's no provider owner-chain to lose.)
- **Platform-native** — pluralization via `Intl.PluralRules`, numbers/dates via
  `Intl.NumberFormat`/`Intl.DateTimeFormat`. Nested dot-path keys, `{param}` interpolation,
  fallback-locale, and a `detectLocale(acceptLanguage, locales)` helper.
