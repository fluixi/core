/** sitemap.xml + robots.txt generators. Pure functions — the build/server wires routes into them. */

export interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
}
export interface SitemapVideo {
  thumbnailLoc: string;
  title: string;
  description: string;
  contentLoc?: string;
  playerLoc?: string;
}
export interface SitemapEntry {
  loc: string;
  lastmod?: string | Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  /** hreflang alternates. */
  alternates?: Array<{ hreflang: string; href: string }>;
  images?: SitemapImage[];
  videos?: SitemapVideo[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function isoDate(d: string | Date): string {
  return d instanceof Date ? d.toISOString() : d;
}

function renderEntry(e: SitemapEntry): string {
  let s = '  <url>\n';
  s += `    <loc>${esc(e.loc)}</loc>\n`;
  if (e.lastmod != null) s += `    <lastmod>${esc(isoDate(e.lastmod))}</lastmod>\n`;
  if (e.changefreq) s += `    <changefreq>${e.changefreq}</changefreq>\n`;
  if (e.priority != null) s += `    <priority>${e.priority.toFixed(1)}</priority>\n`;
  for (const a of e.alternates ?? []) s += `    <xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}"/>\n`;
  for (const img of e.images ?? []) {
    s += `    <image:image>\n      <image:loc>${esc(img.loc)}</image:loc>\n`;
    if (img.title) s += `      <image:title>${esc(img.title)}</image:title>\n`;
    if (img.caption) s += `      <image:caption>${esc(img.caption)}</image:caption>\n`;
    s += `    </image:image>\n`;
  }
  for (const v of e.videos ?? []) {
    s += `    <video:video>\n      <video:thumbnail_loc>${esc(v.thumbnailLoc)}</video:thumbnail_loc>\n`;
    s += `      <video:title>${esc(v.title)}</video:title>\n      <video:description>${esc(v.description)}</video:description>\n`;
    if (v.contentLoc) s += `      <video:content_loc>${esc(v.contentLoc)}</video:content_loc>\n`;
    if (v.playerLoc) s += `      <video:player_loc>${esc(v.playerLoc)}</video:player_loc>\n`;
    s += `    </video:video>\n`;
  }
  s += '  </url>\n';
  return s;
}

/** Build a urlset sitemap. Pass absolute `loc`s. */
export function generateSitemap(entries: SitemapEntry[]): string {
  const ns =
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
    'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
    'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${ns}>\n${entries.map(renderEntry).join('')}</urlset>\n`;
}

/** Split a large set into ≤`limit` chunks (default 50k, the sitemap spec cap). */
export function chunkSitemap(entries: SitemapEntry[], limit = 50000): SitemapEntry[][] {
  const out: SitemapEntry[][] = [];
  for (let i = 0; i < entries.length; i += limit) out.push(entries.slice(i, i + limit));
  return out;
}

/** Build a sitemap index referencing child sitemaps. */
export function generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string | Date }>): string {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const sm of sitemaps) {
    s += `  <sitemap>\n    <loc>${esc(sm.loc)}</loc>\n`;
    if (sm.lastmod != null) s += `    <lastmod>${esc(isoDate(sm.lastmod))}</lastmod>\n`;
    s += '  </sitemap>\n';
  }
  return s + '</sitemapindex>\n';
}

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

export interface RobotsRule {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
}
export interface RobotsOptions {
  rules?: RobotsRule[];
  host?: string;
  sitemaps?: string[];
  /** When false (e.g. non-production), emit a disallow-all robots so previews aren't indexed. */
  production?: boolean;
}

export function generateRobots(opts: RobotsOptions = {}): string {
  if (opts.production === false) {
    return 'User-agent: *\nDisallow: /\n';
  }
  const lines: string[] = [];
  const rules = opts.rules ?? [{ userAgent: '*', allow: '/' }];
  for (const r of rules) {
    for (const ua of ([] as string[]).concat(r.userAgent)) lines.push(`User-agent: ${ua}`);
    for (const a of ([] as string[]).concat(r.allow ?? [])) lines.push(`Allow: ${a}`);
    for (const d of ([] as string[]).concat(r.disallow ?? [])) lines.push(`Disallow: ${d}`);
    if (r.crawlDelay != null) lines.push(`Crawl-delay: ${r.crawlDelay}`);
    lines.push('');
  }
  if (opts.host) lines.push(`Host: ${opts.host}`);
  for (const sm of opts.sitemaps ?? []) lines.push(`Sitemap: ${sm}`);
  return lines.join('\n').replace(/\n+$/, '\n');
}
