import { createMemo } from '@fluixi/core';
import { useParams } from '@fluixi/start/router';
import DocPage from '../../../doc-page.js';
import type { Lang } from '../../../content.js';

export default function V1Doc() {
  const params = useParams<{ lang: string; slug: string }>();
  // Every doc page is the same route, so navigating between two of them changes
  // the params without remounting. Reading params() once at setup snapshots them
  // and the page never updates — which only looked fine while every link did a
  // full page load.
  return createMemo(() => {
    const p = params();
    const lang: Lang = p.lang === 'fr' ? 'fr' : 'en';
    return DocPage({ version: 'v1', lang, slug: p.slug });
  });
}
