import { useParams, useRouteData } from '@fluixi/start/router';
import DocPage from '../../../doc-page.js';
import { loadDoc, type Doc, type Lang } from '../../../content.js';

const langOf = (value: string | undefined): Lang => (value === 'fr' ? 'fr' : 'en');

// The page's HTML, its own module: on the server it is rendered into the page, and the browser
// takes the server's value, so a visit loads only this page and a navigation only the next.
// Every version is a path in the same site, /v1/…, /v2/…; a version with no such page is null.
export const routeData = ({ params }: { params: () => Record<string, string> }) =>
  loadDoc(params().version!, langOf(params().lang), params().slug!);

export default function VersionedDoc() {
  const params = useParams<{ version: string; lang: string; slug: string }>();
  const doc = useRouteData<Doc | null>();
  // Every doc page is the same route, so navigating between two of them changes the params
  // without remounting. The props below are read through on each access, so the page stays
  // mounted and only what depends on the slug updates. Calling DocPage inside a memo instead
  // rebuilt the header and the sidebar for every link in the sidebar.
  return <DocPage version={params().version} lang={langOf(params().lang)} slug={params().slug} doc={doc()} />;
}
