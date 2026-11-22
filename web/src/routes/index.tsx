import { useColorScheme } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import './landing.css';
import { Journey } from '../journey/Journey.js';
import { Intro } from '../home/Intro.js';
import { Tour } from '../home/Tour.js';
import { Assistants, Closing, Footer, Habits, Packages, Runtime, Stage } from '../home/Sections.js';

const SITE = 'https://fluixi.com';
const DOCS_URL = 'https://docs.fluixi.com';
const PLAYGROUND_URL = 'https://playground.fluixi.com';
const GITHUB_URL = 'https://github.com/fluixi/core';

const TITLE = 'Fluixi, fine-grained reactivity with a compiler that understands your code';
const DESC =
  'Fluixi is a TypeScript framework: components run once, and only the text, attribute or branch that changed updates. File routes, server rendering, server functions, API routes, static output and devtools.';

function Nav() {
  const scheme = useColorScheme();
  return (
    <nav class="nav">
      <style scoped>{`
        .nav {
          position: sticky; top: 0; z-index: 50;
          border-bottom: 1px solid var(--line);
          background: var(--bg-head); backdrop-filter: blur(12px);
        }
        .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          max-width: var(--maxw); margin: 0 auto; padding: 0 24px; height: 58px;
        }
        .brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 16px; letter-spacing: -.015em; }
        .nav-links { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted); }
        .nav-links a { padding: 6px 10px; border-radius: var(--r-sm); }
        .nav-links a:hover { color: var(--text); background: var(--hover); }
        .theme-toggle {
          display: inline-grid; place-items: center; width: 32px; height: 32px; padding: 0;
          margin-left: 4px; font-size: 14px; line-height: 1; cursor: pointer; color: var(--muted);
          background: transparent; border: 1px solid var(--line); border-radius: var(--r-md);
          transition: color .15s, border-color .15s;
        }
        .theme-toggle:hover { color: var(--text); border-color: var(--line-strong); }
        @media (max-width: 620px) {
          .nav-links a { padding: 6px 7px; }
          .nav-changelog { display: none; }
        }
      `}</style>
      <div class="nav-inner">
        <a class="brand" href="/">
          <img class="logo" src="/logos/mark.png" alt="" width="21" height="21" /> Fluixi
        </a>
        <div class="nav-links">
          <a href={DOCS_URL}>Docs</a>
          <a href={PLAYGROUND_URL}>Playground</a>
          <a class="nav-changelog" href={`${DOCS_URL}/v1/en/changelog`}>Changelog</a>
          <a href={GITHUB_URL}>GitHub</a>
          <button
            type="button"
            class="theme-toggle"
            aria-label="Switch theme"
            title="Switch theme"
            onClick={() => scheme.toggle()}
          >
            ◐
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function Home() {
  // Rendered into <head> on the server (this page is prerendered) and kept reactive on the
  // client: canonical URL, link previews and the structured data search engines read.
  seo({
    title: TITLE,
    description: DESC,
    canonical: `${SITE}/`,
    og: {
      type: 'website',
      siteName: 'Fluixi',
      url: `${SITE}/`,
      title: TITLE,
      description: DESC,
      image: { url: `${SITE}/og.png`, width: 1200, height: 630, alt: 'Fluixi' },
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC, image: `${SITE}/og.png` },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Fluixi',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      description: DESC,
      url: `${SITE}/`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT',
      codeRepository: GITHUB_URL,
    },
  });

  return (
    <>
      <Journey />
      <div class="page">
        <a class="skip" href="#main">Skip to content</a>
        <Nav />
        <main id="main" tabindex={-1}>
          <Intro />
          <Stage label="One write" line="A signal changes." code="count.set(1)" />
          <Tour />
          <Stage label="It travels" line="The change follows the graph to what reads it." />
          <Packages />
          <Runtime />
          <Stage label="Fine-grained" line="Only what reads it lights up. The rest stays still." />
          <Habits />
          <Assistants />
          <Stage label="Then the DOM" line="One text node changes. That is the whole update." />
          <Closing />
        </main>
        <Footer />
      </div>
    </>
  );
}
