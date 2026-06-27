// Playground app — compiles JSX in-browser, renders it, and graphs its reactivity via
// @fluixi/devtools. Left half = editor/compiled (tabbed); right half = preview + graph.
import { createSignal, onMount } from '@fluixi/core';
import { createReactor, createGraphView, DEVTOOLS_CSS, nodeVersion, nodeState, type GraphView } from '@fluixi/devtools';
import { compile } from './compile';
import { runCompiled, type RunResult } from './run';
import { createEditor, type CodeEditor } from './editor';
import { examples, type Example } from './examples';

export function Playground() {
  const [active, setActive] = createSignal(examples[0].name);
  const [tab, setTab] = createSignal<'editor' | 'compiled'>('editor');
  const [error, setError] = createSignal<string | null>(null);
  const [compiled, setCompiled] = createSignal('');
  const [stats, setStats] = createSignal({ nodes: 0, edges: 0, runs: 0 });

  let editorHost!: HTMLDivElement;
  let editor: CodeEditor;
  let previewEl!: HTMLDivElement;
  let svgEl!: SVGSVGElement;
  let inspectorEl!: HTMLDivElement;

  const reactor = createReactor();
  let view: GraphView | null = null;
  let current: RunResult | null = null;
  let selectedId: number | null = null;
  let raf = 0;

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  function renderInspector() {
    if (!inspectorEl) return;
    const node = selectedId != null ? reactor.graph.get(selectedId) : undefined;
    if (!node) {
      inspectorEl.innerHTML = '<span class="ins-empty">click a node to inspect</span>';
      return;
    }
    const labelOf = (id: number) => reactor.graph.get(id)?.label ?? '?';
    const sources = [...node.deps].map(labelOf);
    const observers = [...reactor.graph.values()].filter((n) => n.deps.has(node.id)).map((n) => n.label);
    const writes = [...node.writes].map(labelOf);
    let val = node.value ?? '';
    try {
      if (node.read) val = String(node.read());
    } catch {
      /* keep snapshot */
    }
    const st = nodeState(node);
    const rel = [
      sources.length ? `<span>↤ reads <b>${esc(sources.join(', '))}</b></span>` : '',
      observers.length ? `<span>↦ feeds <b>${esc(observers.join(', '))}</b></span>` : '',
      writes.length ? `<span>✎ writes <b>${esc(writes.join(', '))}</b></span>` : '',
    ]
      .filter(Boolean)
      .join('');
    inspectorEl.innerHTML =
      `<div class="ins-head"><span class="ins-kind n-${node.kind}">${node.kind}</span><b>${esc(node.label)}</b>` +
      `<span class="ins-meta">v${nodeVersion(node)} · ${node.runs} runs${st ? ' · ' + st : ''}</span></div>` +
      `<div class="ins-val">${esc(clip(val))}</div>` +
      `<div class="ins-rel">${rel}</div>`;
  }

  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (view) {
        reactor.sample();
        view.update(reactor.graph, performance.now());
        let edges = 0;
        let runs = 0;
        for (const n of reactor.graph.values()) {
          edges += n.deps.size + n.writes.size;
          runs += n.runs;
        }
        setStats({ nodes: reactor.graph.size, edges, runs });
        if (selectedId != null) renderInspector();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function run() {
    current?.dispose();
    view ??= createGraphView(svgEl, {
      onSelect: (n) => {
        selectedId = n ? n.id : null;
        renderInspector();
      },
    });
    selectedId = null;
    view.clear();
    let code = '';
    try {
      code = compile(editor.getValue());
      setCompiled(code);
    } catch (e) {
      setError(e instanceof Error ? `Compile · ${e.message}` : String(e));
      setCompiled('');
      return;
    }
    current = runCompiled(code, previewEl, reactor);
    setError(current.error);
    loop();
  }

  function load(ex: Example) {
    setActive(ex.name);
    editor.setValue(ex.code);
    setTab('editor');
    run();
  }

  onMount(() => {
    const style = document.createElement('style');
    style.textContent = DEVTOOLS_CSS;
    document.head.appendChild(style);
    editor = createEditor(editorHost, examples[0].code, run);
    renderInspector();
    run();
  });

  return (
    <div class="pg">
      <header class="pg-head">
        <div class="brand">
          <span class="logo">✦</span>
          <h1>Fluixi Playground</h1>
        </div>
        <nav class="examples">
          {examples.map((ex) => (
            <button class={active() === ex.name ? 'ex on' : 'ex'} onClick={() => load(ex)}>
              {ex.name}
            </button>
          ))}
        </nav>
        <div class="legend">
          <span class="chip n-state">◆ state</span>
          <span class="chip n-memo">ƒ memo</span>
          <span class="chip n-store">▤ store</span>
          <span class="chip n-effect">⚡ effect</span>
        </div>
      </header>

      <section class="pg-left">
        <div class="tabs-bar">
          <div class="tabs">
            <button
              class={tab() === 'editor' ? 't on' : 't'}
              onClick={() => {
                setTab('editor');
                requestAnimationFrame(() => editor?.layout());
              }}
            >
              Editor
            </button>
            <button class={tab() === 'compiled' ? 't on' : 't'} onClick={() => setTab('compiled')}>
              Compiled
            </button>
          </div>
          <button class="run" onClick={() => run()}>
            ▶ Run <span class="kbd">⌘↵</span>
          </button>
        </div>
        <div class={tab() === 'editor' ? 'editor' : 'editor hidden'} ref={(el: HTMLDivElement) => (editorHost = el)} />
        <pre class={tab() === 'compiled' ? 'compiled' : 'compiled hidden'}>{compiled()}</pre>
        <div class={error() ? 'err show' : 'err'}>{error() ?? ''}</div>
      </section>

      <section class="pg-right">
        <div class="r-preview">
          <div class="panel-bar">
            <span>preview</span>
          </div>
          <div class="preview" ref={(el: HTMLDivElement) => (previewEl = el)} />
        </div>
        <div class="r-graph">
          <div class="panel-bar">
            <span>reactive graph</span>
            <span class="stats">
              {stats().nodes} nodes · {stats().edges} edges · {stats().runs} recomputes
            </span>
          </div>
          <div class="graph-wrap">
            <svg class="graph" ref={(el: SVGSVGElement) => (svgEl = el)} preserveAspectRatio="xMidYMid meet" />
          </div>
          <div class="inspector" ref={(el: HTMLDivElement) => (inspectorEl = el)} />
        </div>
      </section>
    </div>
  );
}
