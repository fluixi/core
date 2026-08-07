// Build-time docs registry: every content/<version>/<lang>/<slug>.md is imported raw, parsed to
// HTML with marked, and code is syntax-highlighted with highlight.js — all at build, so the
// prerendered pages ship as static, highlighted HTML (no client-side markdown/highlight cost).
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
// Core + only the languages the content actually fences. The default entry registers ~190
// grammars and was the single largest thing in the client bundle; the docs use six.
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);          // ```html
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['tsx'], { languageName: 'typescript' });
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['html'], { languageName: 'xml' });

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'typescript';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const raw = import.meta.glob('./content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface DocPage {
  version: string;
  lang: string;
  slug: string;
  title: string;
  html: string;
}

const registry = new Map<string, DocPage>();
for (const [path, md] of Object.entries(raw)) {
  const m = path.match(/\/content\/([^/]+)\/([^/]+)\/([^/]+)\.md$/);
  if (!m) continue;
  const [, version, lang, slug] = m;
  const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? slug).trim();
  registry.set(`${version}/${lang}/${slug}`, {
    version, lang, slug, title,
    html: withCopyButtons(marked.parse(md) as string),
  });
}

/**
 * Wrap each code block so it can carry a copy button.
 *
 * Done here, at build time, so the button is in the prerendered HTML rather than being
 * grafted on after hydration — no layout shift, and it works on a page whose JS has not
 * arrived yet (the handler is delegated, so it starts working the moment it does).
 *
 * The language label comes from the class marked already emits, so it costs nothing.
 */
function withCopyButtons(html: string): string {
  return html.replace(
    /<pre><code class="hljs language-([^"]+)">/g,
    (_m, lang) =>
      `<div class="code-block" data-lang="${lang}">` +
      `<button type="button" class="code-copy" data-copy aria-label="Copy code">Copy</button>` +
      `<pre><code class="hljs language-${lang}">`,
  ).replace(/<\/code><\/pre>/g, '</code></pre></div>');
}

export const key = (version: string, lang: string, slug: string) => `${version}/${lang}/${slug}`;
export function getDoc(version: string, lang: string, slug: string): DocPage | undefined {
  return registry.get(key(version, lang, slug));
}
export function allDocs(): DocPage[] {
  return [...registry.values()];
}
/** Newest version first. */
export const VERSIONS = [...new Set(allDocs().map((d) => d.version))].sort().reverse();
export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
