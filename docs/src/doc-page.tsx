import { getDoc, VERSIONS, type Lang } from './content.js';
import { NAV, ORDER, UI, LANG_LABEL } from './nav.js';

// The docs page UI, parameterized by version/lang/slug. Version is a literal path segment (v1/, v2/…)
// so each version has its own route wrapper — the router merges the inner [lang]/[slug] params.
export default function DocPage(props: { version: string; lang: Lang; slug: string }) {
  const { version, slug } = props;
  const lang = props.lang;
  const doc = getDoc(version, lang, slug);
  const ui = UI[lang];
  const link = (s: string) => `/${version}/${lang}/${s}`;
  const titleOf = (s: string) => getDoc(version, lang, s)?.title ?? s;
  const other: Lang = lang === 'en' ? 'fr' : 'en';

  const i = ORDER.indexOf(slug);
  const prev = i > 0 ? ORDER[i - 1] : null;
  const next = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;

  return (
    <div class="docs">
      <header class="d-head">
        <a class="d-brand" href={link('introduction')}>
          <span class="logo">✦</span> {ui.product}
        </a>
        <div class="d-actions">
          <label class="ver">
            <span>{ui.version}</span>
            <select onChange={(e: any) => (location.href = `/${e.target.value}/${lang}/${slug}`)}>
              {VERSIONS.map((v) => (
                <option value={v} selected={v === version}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <a class="lang-toggle" href={`/${version}/${other}/${slug}`}>
            {LANG_LABEL[other]}
          </a>
          <a class="d-link" href="https://playground.fluixi.com">
            {ui.playground}
          </a>
        </div>
      </header>

      <div class="d-body">
        <aside class="d-sidebar">
          {NAV.map((section) => (
            <div class="nav-group">
              <div class="nav-group-title">{section.group[lang]}</div>
              {section.slugs.map((s) => (
                <a class={s === slug ? 'nav-item on' : 'nav-item'} href={link(s)}>
                  {titleOf(s)}
                </a>
              ))}
            </div>
          ))}
        </aside>

        <main class="d-main">
          <article class="prose" innerHTML={doc?.html ?? '<h1>Not found</h1>'} />
          <nav class="d-pager">
            {prev ? (
              <a class="pager" href={link(prev)}>
                <span>← {ui.prev}</span>
                <b>{titleOf(prev)}</b>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a class="pager next" href={link(next)}>
                <span>{ui.next} →</span>
                <b>{titleOf(next)}</b>
              </a>
            ) : (
              <span />
            )}
          </nav>
        </main>
      </div>
    </div>
  );
}
