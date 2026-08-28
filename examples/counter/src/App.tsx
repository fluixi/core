import { createSignal } from 'fluixi';
import { t, locale, setLocale } from './i18n';

/** A tiny reactive counter — fine-grained updates, no virtual DOM. Now i18n'd. */
export function Counter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);

  // Try editing any t('...') below: the string arg autocompletes the LEAF keys
  // from en.json / fr.json — 'title', 'clicks', 'actions.increment', 'footer.language', …
  return (
    <div class="counter">
      <h1>{t('title')}</h1>
      <button class="dec" onClick={() => setCount(count() - 1)}>{t('actions.decrement')}</button>
      <span class="value">{count()}</span>
      <button class="inc" onClick={() => setCount(count() + 1)}>{t('actions.increment')}</button>
      <button class="reset" onClick={() => setCount(props.start ?? 0)}>{t('actions.reset')}</button>

      <p class="clicks">{t('clicks', { count: count() })}</p>

      <footer>
        <span>{t('footer.language')}: </span>
        <button class="lang" onClick={() => setLocale(locale() === 'en' ? 'fr' : 'en')}>
          {locale() === 'en' ? 'Français' : 'English'}
        </button>
        <p class="made">{t('footer.madeWith')}</p>
      </footer>
    </div>
  );
}
