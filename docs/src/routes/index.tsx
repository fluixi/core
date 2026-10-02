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
      <p>
        Redirecting to <a href={TARGET}>the documentation</a>...
      </p>
    </div>
  );
}
