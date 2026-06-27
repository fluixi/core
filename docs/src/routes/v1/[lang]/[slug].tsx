import { useParams } from '@fluixi/start/router';
import DocPage from '../../../doc-page.js';
import type { Lang } from '../../../content.js';

export default function V1Doc() {
  const params = useParams<{ lang: string; slug: string }>();
  const p = params(); // useParams returns an accessor — call it
  const lang: Lang = p.lang === 'fr' ? 'fr' : 'en';
  return <DocPage version="v1" lang={lang} slug={p.slug} />;
}
