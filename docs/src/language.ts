/**
 * The reader's language, when they chose one with the switch. The URL carries the language of
 * each page; this only decides where the home page sends a returning reader.
 */
import { useStorage } from '@fluixi/core/storage';
import { LANGS, type Lang } from './content.js';
import { DEFAULT_LANG } from './nav.js';

export const languageStorage = () => useStorage<{ lang: Lang }>({ scope: 'cookie', namespace: 'docs', cookie: { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' } });

/** The chosen language, else the browser's first one the docs have, else the default. */
export function preferredLanguage(): Lang {
  const chosen = languageStorage().get('lang');
  if (chosen && (LANGS as readonly string[]).includes(chosen)) return chosen;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if ((LANGS as readonly string[]).includes(base!)) return base as Lang;
  }
  return DEFAULT_LANG;
}
