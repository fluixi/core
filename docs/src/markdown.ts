// The docs' markdown, compiled at build time in Node: the plugin below turns each
// content/<version>/<lang>/<slug>.md into a module, so the browser receives a page's HTML and
// never the markdown, marked or highlight.js. `?title` is the title alone, for the sidebar and
// the pager of every page; `?doc` is one page, loaded with its route.
import { readFile } from 'node:fs/promises';
import type { Doc } from './content.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
// Core + only the languages the content fences: the default entry registers ~190 grammars,
// and the docs use six.
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

// An instance of its own: `marked.use` extends a shared global, and the build loads this file
// once for the client and once for the server, which highlighted every block twice.
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'typescript';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

// Heading ids, so a link like `/v1/en/session#roles-and-permissions` lands on its section.
// GitHub's shape: lower case, punctuation dropped, spaces to hyphens, letters of any script
// kept, so a French `Côté serveur` is `#côté-serveur`. A repeated heading on one page gets
// `-1`, `-2` like GitHub's, and the count starts over for each page.
const seen = new Map<string, number>();
const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');

marked.use({
  hooks: {
    preprocess(md: string) {
      seen.clear();
      return md;
    },
  },
  renderer: {
    heading({ tokens, depth, text }) {
      const base = slugOf(text);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n ? `${base}-${n}` : base;
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
  },
});

/**
 * Wrap each code block so it can carry a copy button.
 *
 * Done here, at build time, so the button is in the prerendered HTML rather than being
 * grafted on after hydration, no layout shift, and it works on a page whose JS has not
 * arrived yet (the handler is delegated, so it starts working the moment it does).
 *
 * The language label comes from the class marked already emits, so it costs nothing.
 */
function withCopyButtons(html: string): string {
  // ONE paired match over the whole block, so the wrapper can never be unbalanced.
  //
  // This previously opened on `<pre><code class="hljs language-X">` but closed on every
  // `</code></pre>`. A fence with no language, a file tree, a bare shell line, got a
  // closing `</div>` with no opening one, which closed `<article class="prose">` early and
  // spilled the rest of the page out of the layout.
  //
  // The language group is optional so unlanguaged blocks are wrapped too, and therefore get
  // a copy button as well; they just carry no language label.
  return html.replace(
    /<pre><code(?: class="hljs language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string | undefined, code: string) => {
      const cls = lang ? ` class="hljs language-${lang}"` : '';
      const attr = lang ? ` data-lang="${lang}"` : '';
      return (
        `<div class="code-block"${attr}>` +
        `<button type="button" class="code-copy" data-copy aria-label="Copy code">Copy</button>` +
        `<pre><code${cls}>${code}</code></pre>` +
        `</div>`
      );
    },
  );
}

// First paragraph of the doc as a plain-text meta description. The markdown is already HTML, so
// strip tags AND decode entities (otherwise the head serializer re-escapes `&#39;` → `&amp;#39;`).
function describe(html: string | undefined): string {
  const p = html?.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
  const text = p
    .replace(/<[^>]+>/g, '')
    .replace(/&#3?9;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || 'Fluixi documentation, reactivity, compiled.').slice(0, 155);
}


const TITLE = /^#\s+(.+)$/m;

/** One markdown file as a page: its title, the first paragraph as plain text, and its HTML. */
export function compileDoc(md: string, slug: string): Doc {
  const html = withCopyButtons(marked.parse(md) as string);
  return { title: (md.match(TITLE)?.[1] ?? slug).trim(), description: describe(html), html };
}

export function markdownPages() {
  return {
    name: 'docs-markdown',
    enforce: 'pre' as const,
    async load(this: { addWatchFile(file: string): void }, id: string) {
      // In dev a browser import arrives with Vite's own flags too: `?doc&import`.
      const [file, search] = id.split('?');
      const query = new URLSearchParams(search);
      const kind = query.has('title') ? 'title' : query.has('doc') ? 'doc' : null;
      if (!file!.endsWith('.md') || !kind) return null;
      this.addWatchFile(file!);
      const md = await readFile(file!, 'utf8');
      const slug = file!.slice(file!.lastIndexOf('/') + 1, -'.md'.length);
      const value = kind === 'title' ? (md.match(TITLE)?.[1] ?? slug).trim() : compileDoc(md, slug);
      return { code: `export default ${JSON.stringify(value)};`, moduleType: 'js' };
    },
  };
}
