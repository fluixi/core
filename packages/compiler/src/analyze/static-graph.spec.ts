import { describe, it, expect } from 'vitest';
import { analyzeReactiveGraph, type StaticNode } from './static-graph.js';

const graphOf = (files: { path: string; code: string }[]) => analyzeReactiveGraph(files);
const find = (nodes: StaticNode[], label: string) => nodes.find((n) => n.label === label);
const labelsOf = (nodes: StaticNode[], ids: number[]) =>
  ids.map((id) => nodes.find((n) => n.id === id)?.label).sort();

describe('analyzeReactiveGraph', () => {
  it('reads a component and what it declares', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `import { createSignal, createMemo } from '@fluixi/core';
export function App() {
  const [count, setCount] = createSignal(0);
  const double = createMemo(() => count() * 2);
  return <div>{double()}</div>;
}`,
      },
    ]);

    expect(find(nodes, 'App')?.kind).toBe('component');
    expect(find(nodes, 'count')?.kind).toBe('state');
    expect(find(nodes, 'double')?.kind).toBe('memo');
    expect(find(nodes, 'count')?.createdIn).toBe(find(nodes, 'App')?.id);
  });

  it('reads a dependency from what a memo names', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `import { createSignal, createMemo, createEffect } from '@fluixi/core';
export function App() {
  const [count] = createSignal(0);
  const [other] = createSignal(1);
  const double = createMemo(() => count() * 2);
  createEffect(() => console.log(double(), other()));
}`,
      },
    ]);

    expect(labelsOf(nodes, find(nodes, 'double')!.deps)).toEqual(['count']);
    const effect = nodes.find((n) => n.kind === 'effect')!;
    expect(labelsOf(nodes, effect.deps)).toEqual(['double', 'other']);
  });

  it('does not read a signal initial value as a dependency', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `import { createSignal } from '@fluixi/core';
const [seed] = createSignal(1);
const [copy] = createSignal(seed());`,
      },
    ]);
    expect(find(nodes, 'copy')?.deps).toEqual([]);
  });

  it('follows an import to the module that declared it', () => {
    const { nodes } = graphOf([
      {
        path: 'src/cart.ts',
        code: `import { createStore } from '@fluixi/core';
export const [cart, setCart] = createStore({ items: [] });`,
      },
      {
        path: 'src/total.ts',
        code: `import { createMemo } from '@fluixi/core';
import { cart } from './cart';
export const total = createMemo(() => cart.items.length);`,
      },
    ]);

    expect(find(nodes, 'cart')?.kind).toBe('store');
    expect(labelsOf(nodes, find(nodes, 'total')!.deps)).toEqual(['cart']);
  });

  it('puts a component used in another under it', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `function Row() { return <li />; }
export function App() { return <ul><Row /></ul>; }`,
      },
    ]);
    expect(find(nodes, 'Row')?.createdIn).toBe(find(nodes, 'App')?.id);
  });

  it('reads the $ intrinsics, which have no import to follow', () => {
    const { nodes } = graphOf([
      { path: 'src/App.tsx', code: `export function App() { const n = $signal(0); const d = $memo(() => n() * 2); }` },
    ]);
    expect(find(nodes, 'n')?.kind).toBe('state');
    expect(labelsOf(nodes, find(nodes, 'd')!.deps)).toEqual(['n']);
  });

  it('says it never ran, so a renderer knows not to expect it to', () => {
    const { nodes, static: isStatic } = graphOf([
      { path: 'src/App.tsx', code: `import { createSignal } from '@fluixi/core';\nconst [a] = createSignal(0);` },
    ]);
    expect(isStatic).toBe(true);
    expect(nodes.every((n) => n.runs === 0 && n.lastPulse === 0)).toBe(true);
  });

  it('makes a node for control flow, reading the prop it tracks', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `import { createSignal } from '@fluixi/core';
export function App() {
  const [ready] = createSignal(false);
  const [items] = createSignal([]);
  return <div><Show when={ready()} fallback={<Spinner />}><For each={items()}>{(i) => <li>{i}</li>}</For></Show></div>;
}`,
      },
    ]);
    const show = find(nodes, 'Show');
    // Its own kind: it is a memo at runtime, and reading it as one of the author's memos is
    // what put `Suspense` in the graph as an unexplained `memo`.
    expect(show?.kind).toBe('control');
    expect(find(nodes, 'App')?.id).toBe(show?.createdIn);
    // `fallback` is content: counting it would make the branch depend on what it renders.
    expect(labelsOf(nodes, show!.deps)).toEqual(['ready']);
    expect(labelsOf(nodes, find(nodes, 'For')!.deps)).toEqual(['items']);
  });

  it('nests a Match under its Switch', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `import { createSignal } from '@fluixi/core';
export function App() {
  const [state] = createSignal('a');
  return <Switch><Match when={state() === 'a'}><b /></Match></Switch>;
}`,
      },
    ]);
    expect(find(nodes, 'Match')?.createdIn).toBe(find(nodes, 'Switch')?.id);
    expect(find(nodes, 'Switch')?.createdIn).toBe(find(nodes, 'App')?.id);
    expect(labelsOf(nodes, find(nodes, 'Match')!.deps)).toEqual(['state']);
  });

  it('leaves a name the project declares alone, whatever it is called', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `function Show() { return <b />; }
export function App() { return <Show />; }`,
      },
    ]);
    // One node, and it is the declaration — not control flow that happens to share a name.
    expect(nodes.filter((n) => n.label === 'Show')).toHaveLength(1);
    expect(find(nodes, 'Show')?.kind).toBe('component');
  });

  it('owns a component imported from another file', () => {
    const { nodes } = graphOf([
      { path: 'src/item.tsx', code: `export function Item() { return <li />; }` },
      {
        path: 'src/App.tsx',
        code: `import { Item } from './item.js';
export function App() { return <div><Item /></div>; }`,
      },
    ]);
    expect(find(nodes, 'Item')?.createdIn).toBe(find(nodes, 'App')?.id);
  });

  it('keeps going when one file will not parse', () => {
    const { nodes } = graphOf([
      { path: 'src/broken.tsx', code: 'export function Broken( {' },
      { path: 'src/App.tsx', code: `import { createSignal } from '@fluixi/core';\nconst [ok] = createSignal(0);` },
    ]);
    expect(find(nodes, 'ok')).toBeDefined();
  });
});

describe('what a node is', () => {
  it('draws the router tags as the router, not as components', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `export function App() {
  return <Router routes={routes}><Outlet /></Router>;
}`,
      },
    ]);
    expect(find(nodes, 'Router')?.kind).toBe('router');
    expect(find(nodes, 'Outlet')?.kind).toBe('router');
    // The author's own component keeps its kind.
    expect(find(nodes, 'App')?.kind).toBe('component');
  });

  it('draws every framework tag as framework, whichever group it is in', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `export function App() {
  return <Suspense fallback={null}><Await value={p}><Show when={x}><b /></Show></Await></Suspense>;
}`,
      },
    ]);
    for (const tag of ['Suspense', 'Await', 'Show']) {
      expect(find(nodes, tag)?.kind).toBe('control');
    }
  });

  it('draws an api file as route handlers, not components', () => {
    const { nodes } = graphOf([
      { path: 'src/api/hello.ts', code: `export function GET() {}\nexport function POST() {}` },
    ]);
    expect(find(nodes, 'GET')?.kind).toBe('handler');
    expect(find(nodes, 'POST')?.kind).toBe('handler');
  });
});

describe('where a value reaches the document', () => {
  const app = `import { createSignal } from '@fluixi/core';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <div class="row">
      <span class="num">{count()}</span>
      <button aria-label={\`count is \${count()}\`}>+</button>
    </div>
  );
}`;

  it('names the element a hole is written in, and where', () => {
    const { nodes } = graphOf([{ path: 'src/Counter.tsx', code: app }]);
    const targets = find(nodes, 'count')?.targets ?? [];

    expect(targets.map((t) => (t.name ? `${t.name} of ${t.element}` : t.element))).toEqual([
      'span.num',
      'aria-label of button',
    ]);
    // `{count()}` is on line 6 of this source, which is the fact the source map cannot give.
    expect(targets[0]?.source).toMatchObject({ file: 'src/Counter.tsx', line: 6 });
    expect(targets[1]?.source.line).toBe(7);
  });

  it('leaves a component alone — a tag is not a binding', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `function Row() { return <li />; }
export function App() { return <ul>{Row()}</ul>; }`,
      },
    ]);
    expect(find(nodes, 'Row')?.targets).toBeUndefined();
  });

  it('says nothing about a value the document never reads', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `import { createSignal } from '@fluixi/core';
export function App() {
  const [quiet] = createSignal(0);
  return <b>hi</b>;
}`,
      },
    ]);
    expect(find(nodes, 'quiet')?.targets).toBeUndefined();
  });
});

/**
 * The tags and holes of a `` html`…` `` are inside a string, so none of the walks over the
 * Babel tree can see them: a `<Show>` is not a JSXElement and a `${count()}` is not an
 * expression container. Everything below is what the JSX path already gave.
 */
describe('a template written as html``', () => {
  const app = (body: string) => ({
    path: 'src/App.ts',
    code: `import { signal } from '@fluixi/core';
import { html } from '@fluixi/dom';
export function App() {
  const count = signal(0);
  const items = signal([]);
  return html\`${body}\`;
}`,
  });

  it('finds the control flow written as tags', () => {
    const { nodes } = graphOf([app('<Show when=${count()}><b>hi</b></Show>')]);
    const show = find(nodes, 'Show');
    expect(show?.kind).toBe('control');
    expect(labelsOf(nodes, show?.deps ?? [])).toEqual(['count']);
    expect(find(nodes, 'App')?.id).toBe(show?.createdIn);
  });

  it('finds the control flow written as sugar', () => {
    const { nodes } = graphOf([app('<p if=${count()}>x</p><li each=${items()}>y</li>')]);
    expect(find(nodes, 'Show')?.kind).toBe('control');
    expect(find(nodes, 'For')?.kind).toBe('control');
    expect(labelsOf(nodes, find(nodes, 'For')?.deps ?? [])).toEqual(['items']);
  });

  it('nests a Match under its Switch', () => {
    const { nodes } = graphOf([
      app('<Switch><Match when=${count()}><b>a</b></Match></Switch>'),
    ]);
    expect(find(nodes, 'Match')?.createdIn).toBe(find(nodes, 'Switch')?.id);
  });

  it('places a tag where it is written, not where the template opens', () => {
    const { nodes } = graphOf([app('\n    <Show when=${count()}><b>hi</b></Show>\n  ')]);
    // The template opens on line 6; the tag is on the line after it.
    expect(find(nodes, 'Show')?.source).toMatchObject({ file: 'src/App.ts', line: 7 });
  });

  it('says where a value reaches the document', () => {
    const { nodes } = graphOf([app('<span class="box">${count()}</span>')]);
    const targets = find(nodes, 'count')?.targets ?? [];
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ kind: 'content', element: 'span.box' });
  });

  it('names the attribute a value drives', () => {
    const { nodes } = graphOf([
      app('<input .value=${count()} /><b class:on=${count()}>x</b>'),
    ]);
    const targets = find(nodes, 'count')?.targets ?? [];
    expect(targets.map((t) => `${t.name} of ${t.element}`)).toEqual([
      'value of input',
      'class of b',
    ]);
  });

  it('gives a component used in a template to the body that used it', () => {
    const { nodes } = graphOf([
      {
        path: 'src/App.ts',
        code: `import { html } from '@fluixi/dom';
function Card() { return html\`<div />\`; }
export function App() { return html\`<section><Card /></section>\`; }`,
      },
    ]);
    expect(find(nodes, 'Card')?.createdIn).toBe(find(nodes, 'App')?.id);
  });

  it('leaves a handler alone — an event is not a read', () => {
    const { nodes } = graphOf([app('<button @click=${() => count()}>x</button>')]);
    expect(find(nodes, 'count')?.targets).toBeUndefined();
  });
});

/**
 * File-routes are handed to the router as a table built from a directory listing, so nothing
 * in the source ever names them. A page that declares no signals was therefore connected to
 * nothing and drew as a component belonging to no one.
 */
describe('a page under the routes directory', () => {
  const shell = {
    path: 'src/app.tsx',
    code: `import { Router, Outlet } from '@fluixi/core/router';
import { routes } from '@fluixi/core/routes';
function RootLayout() { return <main><Outlet /></main>; }
export default function App() {
  return <Router routes={[{ path: '/', component: RootLayout, children: routes }]} />;
}`,
  };
  const about = {
    path: 'src/routes/about.tsx',
    code: `export default function About() { return <section><h1>About</h1></section>; }`,
  };

  it('belongs to the outlet it renders into, even declaring nothing reactive', () => {
    const { nodes } = graphOf([shell, about]);
    expect(find(nodes, 'About')?.createdIn).toBe(find(nodes, 'Outlet')?.id);
  });

  it('falls back to the router when no outlet is written out', () => {
    const noOutlet = {
      path: 'src/app.tsx',
      code: `import { Router } from '@fluixi/core/router';
import { routes } from '@fluixi/core/routes';
export default function App() { return <Router routes={routes} />; }`,
    };
    const { nodes } = graphOf([noOutlet, about]);
    expect(find(nodes, 'About')?.createdIn).toBe(find(nodes, 'Router')?.id);
  });

  it('takes the directory the project configured', () => {
    const page = { ...about, path: 'src/pages/about.tsx' };
    expect(find(graphOf([shell, page]).nodes, 'About')?.createdIn).toBeUndefined();
    const { nodes } = analyzeReactiveGraph([shell, page], { routesDir: 'src/pages' });
    expect(find(nodes, 'About')?.createdIn).toBe(find(nodes, 'Outlet')?.id);
  });

  it('drops back to the router when two outlets make that the runtime question', () => {
    // Which outlet a page lands in is not answerable here; which router it is under is.
    const two = {
      path: 'src/app.tsx',
      code: `import { Router, Outlet } from '@fluixi/core/router';
function Left() { return <aside><Outlet /></aside>; }
function Right() { return <section><Outlet /></section>; }
export default function App() { return <Router routes={[]}><Left /><Right /></Router>; }`,
    };
    const { nodes } = graphOf([two, about]);
    expect(find(nodes, 'About')?.createdIn).toBe(find(nodes, 'Router')?.id);
  });

  it('says nothing when there is no router in the project at all', () => {
    const plain = { path: 'src/app.tsx', code: `export default function App() { return <main>hi</main>; }` };
    expect(find(graphOf([plain, about]).nodes, 'About')?.createdIn).toBeUndefined();
  });

  it('leaves a helper beside the page to the page that uses it', () => {
    const withHelper = {
      path: 'src/routes/about.tsx',
      code: `function Byline() { return <small>by us</small>; }
export default function About() { return <section><Byline /></section>; }`,
    };
    const { nodes } = graphOf([shell, withHelper]);
    expect(find(nodes, 'Byline')?.createdIn).toBe(find(nodes, 'About')?.id);
    expect(find(nodes, 'About')?.createdIn).toBe(find(nodes, 'Outlet')?.id);
  });

  it('still gives a plain component to whoever wrote its tag', () => {
    // Not a route, no signals: the case that already worked, kept working.
    const { nodes } = graphOf([
      {
        path: 'src/App.tsx',
        code: `function Footer() { return <footer>hi</footer>; }
export function App() { return <div><Footer /></div>; }`,
      },
    ]);
    expect(find(nodes, 'Footer')?.createdIn).toBe(find(nodes, 'App')?.id);
  });
});

describe('file-based api routes', () => {
  const api = {
    path: 'src/api/hello.ts',
    code: `export function GET() { return new Response('hi'); }
export function POST() { return new Response('ok'); }`,
  };

  it('hangs the handlers off one card of their own', () => {
    const { nodes } = graphOf([api]);
    const card = find(nodes, 'api');
    expect(card?.kind).toBe('handler');
    expect(nodes.filter((n) => n.createdIn === card?.id).map((n) => n.label)).toEqual(['GET', 'POST']);
  });

  it('does not invent the card when there are no handlers', () => {
    const { nodes } = graphOf([
      { path: 'src/App.tsx', code: `export function App() { return <b>hi</b>; }` },
    ]);
    expect(find(nodes, 'api')).toBeUndefined();
  });

  it('leaves a handler that already belongs to something', () => {
    // A route table naming it is a real owner, and better than the directory.
    const { nodes } = graphOf([
      {
        path: 'src/api/hello.ts',
        code: `export function GET() { return new Response('hi'); }
const table = [{ path: '/hello', component: GET }];
export function Server() { return table; }`,
      },
    ]);
    expect(find(nodes, 'GET')?.createdIn).toBe(find(nodes, 'Server')?.id);
  });

  it('names the card after the directory the project configured', () => {
    const { nodes } = analyzeReactiveGraph([{ ...api, path: 'server/routes/hello.ts' }], {
      apiDir: 'server/routes',
    });
    expect(find(nodes, 'api')?.source.file).toBe('server/routes');
  });
});
