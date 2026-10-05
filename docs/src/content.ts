// The docs' pages, compiled from content/<version>/<lang>/<slug>.md by the plugin in
// markdown.ts. Titles are bundled, a few bytes each, since every page's sidebar and pager name
// other pages; a page's HTML is its own module, loaded by its route's `routeData`.

export interface Doc {
  title: string;
  /** The first paragraph as plain text, for the meta description. */
  description: string;
  html: string;
}

const titles = import.meta.glob<string>('./content/**/*.md', { query: '?title', import: 'default', eager: true });
const pages = import.meta.glob<Doc>('./content/**/*.md', { query: '?doc', import: 'default' });

const path = (version: string, lang: string, slug: string) => `./content/${version}/${lang}/${slug}.md`;

/** A page, or null for a slug that has none: route data has to be JSON. */
export function loadDoc(version: string, lang: string, slug: string): Promise<Doc | null> {
  const load = pages[path(version, lang, slug)];
  return load ? load() : Promise.resolve(null);
}

export function titleOf(version: string, lang: string, slug: string): string {
  return titles[path(version, lang, slug)] ?? slug;
}

/** Newest version first. */
export const VERSIONS = [...new Set(Object.keys(titles).map((p) => p.split('/')[2]!))].sort().reverse();
export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
