import { onMount } from '@fluixi/core';
import { DEFAULT_VERSION, DEFAULT_LANG, DEFAULT_SLUG } from '../nav.js';

// The docs home redirects to the default version/language. The <a> keeps the prerender crawler
// (and no-JS visitors) on a real link; the client redirects on mount.
const TARGET = `/${DEFAULT_VERSION}/${DEFAULT_LANG}/${DEFAULT_SLUG}`;

export default function Index() {
  onMount(() => {
    if (typeof location !== 'undefined') location.replace(TARGET);
  });
  return (
    <div class="redirect">
      <p>
        Redirecting to <a href={TARGET}>the documentation</a>…
      </p>
    </div>
  );
}
