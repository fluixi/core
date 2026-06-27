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
    <div style="min-height:100vh;display:grid;place-items:center;background:#07080d;color:#8b91a4;font-family:system-ui">
      <p>
        Redirecting to <a href={TARGET} style="color:#5eead4">the documentation</a>…
      </p>
    </div>
  );
}
