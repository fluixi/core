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
