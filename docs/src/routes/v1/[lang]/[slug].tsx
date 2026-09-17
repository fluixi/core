import { useParams } from '@fluixi/start/router';
import DocPage from '../../../doc-page.js';
import type { Lang } from '../../../content.js';

export default function V1Doc() {
  const params = useParams<{ lang: string; slug: string }>();
  // Every doc page is the same route, so navigating between two of them changes the params
  // without remounting. The props below are read through on each access, so the page stays
  // mounted and only what depends on the slug updates. Calling DocPage inside a memo instead
  // rebuilt the header and the sidebar for every link in the sidebar.
  return (
    <DocPage
      version="v1"
      lang={(params().lang === 'fr' ? 'fr' : 'en') as Lang}
      slug={params().slug}
    />
  );
}
