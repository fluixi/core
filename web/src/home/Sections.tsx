import { For } from '@fluixi/core';
import './sections.css';

const DOCS_URL = 'https://docs.fluixi.com';
const PLAYGROUND_URL = 'https://playground.fluixi.com';
const GITHUB_URL = 'https://github.com/fluixi/core';

/** A stretch of scroll that belongs to the scene, with one line of its story. */
export function Stage(props: { label: string; line: string; code?: string }) {
  return (
    <section class="stage wrap" aria-label={props.label}>
      <p class="stage-label">{props.label}</p>
      <p class="stage-line">{props.line}</p>
      {props.code ? <p class="stage-code">{props.code}</p> : null}
    </section>
  );
}

const PACKAGES = ['reactive', 'compiler', 'router', 'start', 'server', 'forms', 'session', 'oauth2', 'realtime', 'storage', 'devtools'];

export function Packages() {
  return (
    <section class="parade wrap" aria-label="Fluixi packages">
      <ul>
        <For each={PACKAGES}>{(name: string) => <li>{name}</li>}</For>
      </ul>
      <p>Some of the @fluixi packages. Use the whole stack, or one piece.</p>
    </section>
  );
}

interface Point {
  title: string;
  text: string;
}

function Grid(props: { title: string; lead: string; points: Point[]; narrow?: boolean; list?: boolean }) {
  return (
    <section class="wrap glass-section">
      <div classList={{ glass: true, narrow: !!props.narrow }}>
        <div class="glass-head">
          <h2>{props.title}</h2>
          <p>{props.lead}</p>
        </div>
        <div classList={{ 'glass-grid': !props.list, 'glass-list': !!props.list }}>
          <For each={props.points}>
            {(p: Point) => (
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}

export function Runtime() {
  return (
    <Grid
      narrow
      title="A small runtime, a compiler on top."
      lead="The runtime does the reactive work; the compiler removes the ceremony around it."
      points={[
        { title: 'About 5 KB for a whole app', text: 'A counter app ships 5.3 KB gzipped, runtime included, or 5.6 KB when the page is rendered on the server and hydrates.' },
        { title: 'Reactivity without a build', text: 'Signals, effects and html`` templates run from a script tag through the CDN build.' },
        { title: 'A compiler for the rest', text: 'JSX, live destructured props, $signal with no import, the server boundary.' },
        { title: 'One package, or all', text: 'Use @fluixi/reactive alone, or the full stack through @fluixi/start.' },
        { title: 'One model, both sides', text: 'The same components render on the server and hydrate in the browser.' },
      ]}
    />
  );
}

export function Habits() {
  return (
    <Grid
      title="Habits you can drop."
      lead="Most of the work in a re-rendering framework goes into avoiding re-renders. Without them, a lot of it goes away."
      points={[
        { title: 'Components run once', text: 'No re-render, no memoised callbacks, no dependency arrays.' },
        { title: 'Reading is subscribing', text: 'Call count() where it is shown; that read is what updates.' },
        { title: 'Destructure freely', text: 'The compiler keeps destructured props live, defaults included.' },
        { title: 'Effects run on the server too', text: 'Browser-only work goes in onMount; the docs say where each part runs.' },
        { title: 'Two syntaxes, one output', text: 'JSX and html`` compile to the same calls.' },
        { title: 'Ship less with load:', text: 'load:visible, load:idle and the others move a component to its own chunk.' },
        { title: 'Secrets stay server-side', text: 'Browser code that reads a variable not listed as public fails the build.' },
        { title: 'Everything is inspectable', text: 'The devtools show the graph and what each write caused.' },
      ]}
    />
  );
}

export function Assistants() {
  return (
    <Grid
      narrow
      list
      title="Readable by people and by assistants."
      lead="Fluixi looks like React and works like Solid, so assistants trained on React need the rules. They ship with the code."
      points={[
        { title: 'Rules in every package', text: 'llms.txt in the installed packages matches the version you run.' },
        { title: 'Every page as Markdown', text: 'The docs serve llms.txt, llms-full.txt, and each page at its address plus .md.' },
        { title: 'Instructions in new apps', text: 'create-fluixi writes an AGENTS.md that points at those rules.' },
      ]}
    />
  );
}

export function Closing() {
  return (
    <section class="wrap closing">
      <div class="glass">
        <h2>Start in one command.</h2>
        <p>Scaffold an app, then follow the quick start.</p>
        <span class="closing-install"><b>$</b>npm create fluixi</span>
        <a class="btn primary" href={`${DOCS_URL}/v1/en/quickstart`}>Read the quick start</a>
      </div>
      <div class="glass">
        <h2>Follow the releases.</h2>
        <p>Every release of every package, newest first, in the changelog.</p>
        <a class="btn ghost" href={`${DOCS_URL}/v1/en/changelog`}>Open the changelog</a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer class="ending wrap">
      <span>
        Released under the <a href={`${GITHUB_URL}/blob/main/LICENSE`}>MIT License</a>. Copyright © 2026 Ibrahima Touré
      </span>
      <nav aria-label="Footer">
        <a href={DOCS_URL}>Docs</a>
        <a href={PLAYGROUND_URL}>Playground</a>
        <a href={`${DOCS_URL}/v1/en/changelog`}>Changelog</a>
        <a href={GITHUB_URL}>GitHub</a>
        <a href="/llms.txt">llms.txt</a>
      </nav>
    </footer>
  );
}
