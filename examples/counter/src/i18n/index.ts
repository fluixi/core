import { createI18n } from '@fluixi/core/i18n';
import en from './en.json';
import fr from './fr.json';

/**
 * Keys are inferred from en/fr — `t('...')` autocompletes every LEAF path:
 *   'title' · 'clicks' (plural) · 'actions.increment' · 'footer.language' · …
 * (nested branches like 'actions' / 'footer' are correctly NOT offered).
 */
export const i18n = createI18n({
  locale: 'en',
  locales: ['en', 'fr'] as const,
  messages: { en, fr },
});

export const { t, n, d, locale, setLocale } = i18n;
