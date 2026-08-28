import { createSignal, onMount } from '@fluixi/core';
import { runSnippet, type ReactorHandle } from './reactor.js';
import { createGraphView } from './graph-view.js';
import { examples, type Example } from './examples.js';

// Playground — itself a Fluixi app. Chrome (tabs, editor, stats) is reactive @fluixi JSX; the
// preview + graph are dynamic regions driven by the sandboxed snippet and one rAF loop.
export function Playground() {
  const [active, setActive] = createSignal(examples[0].name);
  const [error, setError] = createSignal<string | null>(null);
  const [stats, setStats] = createSignal({ nodes: 0, edges: 0, runs: 0 });

  let editorEl!: HTMLTextAreaElement;
  let previewEl!: HTMLDivElement;
  let svgEl!: SVGSVGElement;

  let handle: ReactorHandle | null = null;
  let view: ReturnType<typeof createGraphView> | null = null;
  let raf = 0;

  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (handle && view) {
        handle.sample();
        view.update(handle.graph, performance.now());
        let edges = 0;
        let runs = 0;
        for (const n of handle.graph.values()) {
          edges += n.deps.size;
          runs += n.runs;
        }
        setStats({ nodes: handle.graph.size, edges, runs });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function run() {
    handle?.dispose();
    view ??= createGraphView(svgEl);
    view.clear();
    handle = runSnippet(editorEl.value, previewEl);
    setError(handle.error);
    loop();
  }

  function load(ex: Example) {
    setActive(ex.name);
    editorEl.value = ex.code;
    run();
  }

  onMount(() => load(examples[0]));

  return (
    <div class="pg">
      <header class="pg-head">
        <div class="brand">
          <span class="logo">✦</span>
          <div>
            <h1>Fluixi Playground</h1>
            <p>see your reactivity — the live TC39 signal graph</p>
          </div>
        </div>
        <div class="legend">
          <span class="chip n-state">◆ state</span>
          <span class="chip n-memo">ƒ memo</span>
          <span class="chip n-effect">⚡ effect</span>
        </div>
      </header>

      <aside class="pg-rail">
        <div class="rail-title">Examples</div>
        {examples.map((ex) => (
          <button class={active() === ex.name ? 'tab on' : 'tab'} onClick={() => load(ex)}>
            <span class="tab-name">{ex.name}</span>
            <span class="tab-blurb">{ex.blurb}</span>
          </button>
        ))}
      </aside>

      <section class="pg-editor">
        <div class="panel-bar">
          <span>code</span>
          <button class="run" onClick={() => run()}>
            ▶ Run
          </button>
        </div>
        <textarea
          class="editor"
          spellcheck={false}
          ref={(el: HTMLTextAreaElement) => (editorEl = el)}
        />
        <div class={error() ? 'err show' : 'err'}>{error() ?? ''}</div>
      </section>

      <section class="pg-preview">
        <div class="panel-bar">
          <span>preview</span>
        </div>
        <div class="preview" ref={(el: HTMLDivElement) => (previewEl = el)} />
      </section>

      <section class="pg-graph">
        <div class="panel-bar">
          <span>reactive graph</span>
          <span class="stats">
            {stats().nodes} nodes · {stats().edges} edges · {stats().runs} recomputes
          </span>
        </div>
        <div class="graph-wrap">
          <svg class="graph" ref={(el: SVGSVGElement) => (svgEl = el)} preserveAspectRatio="xMidYMid meet" />
        </div>
      </section>
    </div>
  );
}
