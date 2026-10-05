import { onMount } from '@fluixi/core';
import { DEFAULT_VERSION, DEFAULT_LANG, DEFAULT_SLUG } from '../nav.js';
import { preferredLanguage } from '../language.js';

// The docs home redirects to the reader's language: the one they chose, else their browser's.
// The <a> keeps the prerender crawler (and no-JS visitors) on a real link to the default.
const TARGET = `/${DEFAULT_VERSION}/${DEFAULT_LANG}/${DEFAULT_SLUG}`;

export default function Index() {
  onMount(() => {
    if (typeof location !== 'undefined') location.replace(`/${DEFAULT_VERSION}/${preferredLanguage()}/${DEFAULT_SLUG}`);
  });
  return (
    <div class="redirect">
      <style scoped>{`
        /* The home route redirects; this shows for the moment before it does. */
        .redirect { min-height: 100vh; display: grid; place-items: center; color: var(--muted); font-size: 15px; }
        .redirect a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
      <p>
        Redirecting to <a href={TARGET}>the documentation</a>...
      </p>
    </div>
  );
}
