// Playground app — compiles a multi-file project in-browser, mounts it, and graphs its
// reactivity via @fluixi/devtools. Left = file tree + editor; right = preview + graph.
import { createSignal, onMount } from '@fluixi/core';
import { createGraphView, DEVTOOLS_CSS, formatValue, nodeVersion, nodeState, type GraphView, type ObservedGraph } from '@fluixi/devtools';
import { runProject, type RenderMode, type RunResult } from './run';

/** What the right-hand pane is showing. */
type OutputTab = 'preview' | 'compiled' | 'html' | 'css' | 'ssr';

const TAB_HINTS: Record<OutputTab, string> = {
  preview: 'The running page',
  compiled: 'What the compiler made of the open file',
  html: 'The document as it stands, shell and all',
  css: 'The stylesheets the run pulled in',
  ssr: 'What a server would have sent, before hydration',
};
import { formatCompiled } from './compile';
import { KNOWN_SPECIFIERS } from './modules';
import {
  createEditor,
  createViewer,
  setEditorTheme,
  setProjectLibs,
  type CodeEditor,
  type CodeViewer,
} from './editor';
import { examples } from './examples';
import { tree } from './tree';
import {
  decodeProject,
  encodeProject,
  findEntry,
  loadSavedProject,
  normalizePath,
  saveProject,
  validatePath,
  type Project,
  type ProjectFile,
} from './project';

function startingProject(): Project {
  const fromUrl = location.hash.startsWith('#p=') ? decodeProject(location.hash.slice(3)) : null;
  return structuredClone(fromUrl ?? loadSavedProject() ?? examples[0]);
}

export function Playground() {
  const initial = startingProject();

  const [files, setFiles] = createSignal<ProjectFile[]>(initial.files);
  const [openPath, setOpenPath] = createSignal(findEntry(initial.files, initial.entry));
  const [entry, setEntry] = createSignal(findEntry(initial.files, initial.entry));
  const [projectName, setProjectName] = createSignal(initial.name);
  const [output, setOutput] = createSignal<OutputTab>('preview');
  const [mode, setMode] = createSignal<RenderMode>(
    (localStorage.getItem('fluixi-pg-mode') as RenderMode) || 'spa',
  );
  const [error, setError] = createSignal<string | null>(null);
  const [compiled, setCompiled] = createSignal('');
  const [shared, setShared] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [theme, setTheme] = createSignal(localStorage.getItem('fluixi-pg-theme') ?? 'dark');
  const [sidebar, setSidebar] = createSignal(localStorage.getItem('fluixi-pg-sidebar') !== 'off');
  const [split, setSplit] = createSignal(Number(localStorage.getItem('fluixi-pg-split')) || 50);
  const [stats, setStats] = createSignal({ nodes: 0, edges: 0, runs: 0 });
  // Folders start open; shutting one is the exception worth remembering.
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set());

  let rootEl!: HTMLDivElement;
  let rightEl!: HTMLElement;
  let editorHost!: HTMLDivElement;
  let editor: CodeEditor;
  let previewEl!: HTMLDivElement;
  let compiledHost!: HTMLDivElement;
  let viewer: CodeViewer | null = null;
  let svgEl!: SVGSVGElement;
  let inspectorEl!: HTMLDivElement;

  // The graph belongs to the preview iframe now, so it arrives with each run.
  let reactor: ObservedGraph | null = null;
  let view: GraphView | null = null;
  let current: RunResult | null = null;
  let selectedId: number | null = null;
  let raf = 0;
  let saveTimer = 0;

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const at = (s?: { file?: string; line?: number; column?: number }) =>
    s ? [s.file, s.line, s.column].filter((p) => p != null).join(':') : '';

  /** The project as it stands in the editor, which is the source of truth for the text. */
  const snapshot = (): Project => ({
    name: projectName(),
    entry: entry(),
    files: files().map((f) => ({ path: f.path, code: editor?.read(f.path) || f.code })),
  });

  /** What the inspector last drew, so a frame that changed nothing does not redraw it. */
  let inspectorSignature = '';

  function renderInspector() {
    if (!inspectorEl) return;
    const node = selectedId != null ? reactor?.graph.get(selectedId) : undefined;
    if (!node) {
      if (inspectorSignature === 'empty') return;
      inspectorSignature = 'empty';
      inspectorEl.innerHTML = '<span class="ins-empty">click a node to inspect</span>';
      return;
    }
    const labelOf = (id: number) => reactor?.graph.get(id)?.label ?? '?';
    const sources = [...node.deps].map(labelOf);
    const observers = [...(reactor?.graph.values() ?? [])].filter((n) => n.deps.has(node.id)).map((n) => n.label);
    const writes = [...node.writes].map(labelOf);
    // The graph's own formatter, with room to read: a store holds an object, and String()
    // renders that as [object Object].
    let val = node.detail ?? node.value ?? '';
    try {
      if (node.read) val = formatValue(node.read(), 600);
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
    const signature = `${node.id}|${node.kind}|${val}|${node.runs}|${st ?? ''}|${rel}|${at(node.source)}`;
    if (signature === inspectorSignature) return;
    inspectorSignature = signature;

    inspectorEl.innerHTML =
      `<div class="ins-head"><span class="ins-kind n-${node.kind}">${node.kind}</span><b>${esc(node.label)}</b>` +
      `<span class="ins-meta">v${nodeVersion(node)} · ${node.runs} runs${st ? ' · ' + st : ''}</span></div>` +
      `<div class="ins-val" title="${esc(val)}">${esc(clip(val))}</div>` +
      `<div class="ins-rel">${rel}</div>` +
      // Only when the graph carries one. The playground reads it and renders it; where it
      // came from is devtools' business.
      (node.source ? `<div class="ins-source">📍 ${esc(at(node.source))}</div>` : '') +
      // A component is created where its tag is written; where it is declared is elsewhere,
      // and only worth a line when it is somewhere else.
      (node.declaredAt && at(node.declaredAt) !== at(node.source)
        ? `<div class="ins-source">◧ declared ${esc(at(node.declaredAt))}</div>`
        : '');
  }

  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (view && reactor) {
        reactor.sample();
        view.update(reactor.graph);
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

  async function run() {
    current?.dispose();
    view ??= createGraphView(svgEl, {
      onSelect: (n) => {
        selectedId = n ? n.id : null;
        renderInspector();
      },
    });
    selectedId = null;
    view.clear();

    const project = snapshot();
    setFiles(project.files);
    current = await runProject(project, previewEl, mode());
    reactor = current.graph;
    setError(current.error);
    setCompiled(current.compiled.get(openPath()) ?? current.compiled.get(project.entry) ?? '');
    void showOutputText();
    loop();
  }

  /** The output side of the window: the running page, or what the compiler made of the file. */
  function showOutput(which: OutputTab) {
    setOutput(which);
    if (which === 'preview') return;
    void showOutputText();
    // Monaco measures itself on layout, and it was hidden until this frame.
    requestAnimationFrame(() => viewer?.layout());
  }

  /** What each tab reads out of the run, once it has one. */
  async function showOutputText() {
    if (!compiledHost) return;
    viewer ??= createViewer(compiledHost);
    const tab = output();
    if (tab === 'preview') return;

    if (tab === 'compiled') return showCompiled();
    if (!current) {
      viewer.show('// run to see the output', 'output.js');
      return;
    }
    if (tab === 'html') viewer.show(current.html() || '<!-- nothing rendered -->', 'output.html');
    if (tab === 'css') viewer.show(current.css() || '/* the project has no stylesheets */', 'output.css');
    if (tab === 'ssr') {
      viewer.show(
        mode() === 'ssr'
          ? current.ssr() || '<!-- the entry did not render anything -->'
          : '<!-- switch the run to ssr to see what the server would send -->',
        'output.html',
      );
    }
    requestAnimationFrame(() => viewer?.layout());
  }

  let showing = 0;
  async function showCompiled() {
    if (!compiledHost) return;
    viewer ??= createViewer(compiledHost);
    const code = compiled();
    if (!code) {
      // Nothing to show is two different things: nothing has run yet, or this file is not
      // something the compiler touches.
      viewer.show(current ? `// ${openPath()} is not compiled` : '// run to see the compiled output', openPath());
      requestAnimationFrame(() => viewer?.layout());
      return;
    }
    // Printing is async only because babel loads on demand; a later file must win.
    const turn = ++showing;
    const text = await formatCompiled(code);
    if (turn !== showing) return;
    viewer.show(text, openPath());
    requestAnimationFrame(() => viewer?.layout());
  }

  function setRenderMode(next: RenderMode) {
    if (mode() === next) return;
    setMode(next);
    localStorage.setItem('fluixi-pg-mode', next);
    // The mode changes what the run does, not what it compiles, so it takes a re-run.
    void run();
  }

  function toggleFolder(path: string) {
    const next = new Set(collapsed());
    if (!next.delete(path)) next.add(path);
    setCollapsed(next);
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveProject(snapshot()), 400);
  }

  /** `class` re-applies reactively here but a function-valued `style` does not, so the split
      is written straight onto the element. */
  function applySplit(pct: number) {
    const clamped = Math.min(80, Math.max(20, pct));
    setSplit(clamped);
    rootEl?.style.setProperty('--split', `${clamped}%`);
  }

  function toggleTheme() {
    const next = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('fluixi-pg-theme', next);
    document.documentElement.dataset.theme = next;
    // Monaco has its own palette and does not read the page's custom properties.
    setEditorTheme(next);
  }

  function toggleSidebar() {
    const next = !sidebar();
    setSidebar(next);
    localStorage.setItem('fluixi-pg-sidebar', next ? 'on' : 'off');
    requestAnimationFrame(() => editor?.layout());
  }

  /**
   * The split is a percentage of the window, applied as a grid column. Pointer capture keeps
   * the drag alive over the editor and the preview, which both swallow pointer events of
   * their own.
   */
  function startRowDrag(event: PointerEvent) {
    event.preventDefault();
    const move = (e: PointerEvent) => {
      const box = rightEl.getBoundingClientRect();
      const pct = ((e.clientY - box.top) / box.height) * 100;
      const clamped = Math.min(85, Math.max(15, pct));
      rightEl.style.setProperty('--rows', `${clamped}%`);
      localStorage.setItem('fluixi-pg-rows', String(Math.round(clamped)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }

  /** Listening on the window rather than the handle: the pointer leaves a 5px target the
      moment it moves, and capture is not reliable across the editor's own handlers. */
  function startDrag(event: PointerEvent) {
    event.preventDefault();
    const vertical = matchMedia('(max-width: 1100px)').matches;

    const move = (e: PointerEvent) => {
      const pct = vertical ? (e.clientY / window.innerHeight) * 100 : (e.clientX / window.innerWidth) * 100;
      applySplit(pct);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      localStorage.setItem('fluixi-pg-split', String(Math.round(split())));
      editor?.layout();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }

  function loadProject(project: Project) {
    const copy = structuredClone(project);
    const start = findEntry(copy.files, copy.entry);
    setProjectName(copy.name);
    setFiles(copy.files);
    setEntry(start);
    setOpenPath(start);
    editor.reset(copy.files);
    setProjectLibs(copy.files);
    editor.open(start, copy.files.find((f) => f.path === start)?.code ?? '');
    setOutput('preview');
    void run();
  }

  function openFile(path: string) {
    setOpenPath(path);
    editor.open(path, files().find((f) => f.path === path)?.code ?? '');
    requestAnimationFrame(() => editor.layout());
    if (current) {
      setCompiled(current.compiled.get(path) ?? '');
      void showOutputText();
    }
  }

  function addFile() {
    // Prefilled with the open file's folder: a path is how a folder comes into being here,
    // and typing `src/` again for every file next to the one you are editing is tedious.
    const open = openPath();
    const folder = open.includes('/') ? open.slice(0, open.lastIndexOf('/') + 1) : '';
    const name = prompt('New file', `${folder}Component.tsx`);
    if (name == null) return;
    const path = normalizePath(name);
    const problem = validatePath(path, files());
    if (problem) {
      setError(problem);
      return;
    }
    const seed = /\.(tsx|jsx)$/.test(path)
      ? `export default function ${path.replace(/.*\//, '').replace(/\.\w+$/, '')}() {\n  return <div>new</div>;\n}\n`
      : '';
    setFiles([...files(), { path, code: seed }]);
    editor.open(path, seed);
    setOpenPath(path);
    setError(null);
    persist();
  }

  function renameFile(path: string) {
    const name = prompt('Rename file', path);
    if (name == null) return;
    const next = normalizePath(name);
    if (next === path) return;
    const problem = validatePath(next, files(), path);
    if (problem) {
      setError(problem);
      return;
    }
    editor.rename(path, next);
    setFiles(files().map((f) => (f.path === path ? { ...f, path: next, code: editor.read(next) } : f)));
    if (entry() === path) setEntry(next);
    if (openPath() === path) setOpenPath(next);
    setError(null);
    persist();
  }

  function removeFile(path: string) {
    if (files().length === 1) {
      setError('A project needs at least one file.');
      return;
    }
    if (!confirm(`Delete ${path}?`)) return;
    const rest = files().filter((f) => f.path !== path);
    editor.remove(path);
    setFiles(rest);
    const nextEntry = findEntry(rest, entry() === path ? undefined : entry());
    setEntry(nextEntry);
    if (openPath() === path) openFile(nextEntry);
    setError(null);
    persist();
  }

  async function share() {
    const url = `${location.origin}${location.pathname}#p=${encodeProject(snapshot())}`;
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard?.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      setError('Could not copy — the URL bar now holds the shareable link.');
    }
  }

  onMount(() => {
    document.documentElement.dataset.theme = theme();
    const style = document.createElement('style');
    style.textContent = DEVTOOLS_CSS;
    document.head.appendChild(style);
    editor = createEditor(editorHost, {
      files: files(),
      open: openPath(),
      onRun: () => void run(),
      onSave: () => {
        clearTimeout(saveTimer);
        saveProject(snapshot());
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      },
      getFiles: () => files(),
      specifiers: KNOWN_SPECIFIERS,
    });
    setProjectLibs(files());
    editor.onChange(() => {
      setFiles(editor.readAll());
      setProjectLibs(files());
      persist();
    });
    renderInspector();
    void run();
  });

  return (
    <div
      class={() => (sidebar() ? 'pg' : 'pg no-sidebar')}
      ref={(el: HTMLDivElement) => {
        rootEl = el;
        el.style.setProperty('--split', `${split()}%`);
      }}
    >
      <header class="pg-head">
        <div class="brand">
          <button class="icon burger" title="Toggle files" aria-label="Toggle files" onClick={toggleSidebar}>
            ☰
          </button>
          <img class="logo" src="/logos/mark.png" alt="" width="20" height="20" />
          <h1>Fluixi Playground</h1>
        </div>
        <nav class="examples">
          {examples.map((ex) => (
            <button class={projectName() === ex.name ? 'ex on' : 'ex'} onClick={() => loadProject(ex)}>
              {ex.name}
            </button>
          ))}
        </nav>
        <div class="legend">
          <span class="chip n-state">◆ state</span>
          <span class="chip n-memo">ƒ memo</span>
          <span class="chip n-store">▤ store</span>
          <span class="chip n-effect">⚡ effect</span>
          <span class="chip n-component">◧ component</span>
        </div>
        <div class="head-actions">
          {() => (saved() ? <span class="saved">saved</span> : null)}
          <button class="ghost" title="Switch theme" onClick={toggleTheme}>
            {() => (theme() === 'dark' ? '☾' : '☀')}
          </button>
          <button class="ghost" onClick={() => void share()}>
            {() => (shared() ? '✓ link copied' : 'Share')}
          </button>
        </div>
      </header>

      <section class="pg-left">
        <div class="files">
          <div class="files-bar">
            <span>files</span>
            <button class="icon" title="New file" onClick={addFile}>
              +
            </button>
          </div>
          <ul class="file-list">
            {() =>
              tree(files(), collapsed()).map((row) =>
                row.kind === 'folder' ? (
                  <li class="folder">
                    <button
                      class="file-open"
                      style={`padding-left:${10 + row.depth * 12}px`}
                      onClick={() => toggleFolder(row.path)}
                    >
                      <span class="twist">{row.open ? '▾' : '▸'}</span>
                      <span class="file-name">{row.name}</span>
                    </button>
                  </li>
                ) : (
                  <li class={openPath() === row.path ? 'file on' : 'file'}>
                    <button
                      class="file-open"
                      style={`padding-left:${10 + row.depth * 12}px`}
                      onClick={() => openFile(row.path)}
                    >
                      <span class="file-name">{row.name}</span>
                      {() => (entry() === row.path ? <span class="badge">entry</span> : null)}
                    </button>
                    <span class="file-actions">
                      {() =>
                        entry() === row.path ? null : (
                          <button
                            class="icon"
                            title="Make this the entry"
                            onClick={() => {
                              setEntry(row.path);
                              persist();
                            }}
                          >
                            ▸
                          </button>
                        )
                      }
                      <button class="icon" title="Rename" onClick={() => renameFile(row.path)}>
                        ✎
                      </button>
                      <button class="icon" title="Delete" onClick={() => removeFile(row.path)}>
                        ×
                      </button>
                    </span>
                  </li>
                ),
              )
            }
          </ul>
        </div>

        <div class="pane">
          <div class="tabs-bar">
            <div class="tabs">
              <button class="t on">{() => openPath() || 'Editor'}</button>
            </div>
            <button class="run" onClick={() => void run()}>
              ▶ Run <span class="kbd">⌘↵</span>
            </button>
          </div>
          <div class="editor" ref={(el: HTMLDivElement) => (editorHost = el)} />
          <div class={error() ? 'err show' : 'err'}>{error() ?? ''}</div>
        </div>
      </section>

      <div
        class="splitter"
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        ref={(el: HTMLDivElement) => el.addEventListener('pointerdown', startDrag)}
      />

      <section
        class="pg-right"
        ref={(el: HTMLElement) => {
          rightEl = el;
          el.style.setProperty('--rows', `${Number(localStorage.getItem('fluixi-pg-rows')) || 45}%`);
        }}
      >
        <div class="r-preview">
          <div class="panel-bar">
            <span class="tabs">
              {() =>
                (['preview', 'compiled', 'html', 'css', 'ssr'] as OutputTab[]).map((name) => (
                  <button
                    class={output() === name ? 't on' : 't'}
                    onClick={() => showOutput(name)}
                    title={TAB_HINTS[name]}
                  >
                    {name}
                  </button>
                ))
              }
            </span>
            <span class="mode">
              {() => (output() === 'compiled' ? <span class="stats">{openPath()}</span> : '')}
              <button
                class={mode() === 'spa' ? 'm on' : 'm'}
                title="Render in the browser"
                onClick={() => setRenderMode('spa')}
              >
                spa
              </button>
              <button
                class={mode() === 'ssr' ? 'm on' : 'm'}
                title="Render to html first, then hydrate — the same compiled code either way"
                onClick={() => setRenderMode('ssr')}
              >
                ssr
              </button>
            </span>
          </div>
          {/* The preview keeps running while the compiled output is on top of it: hiding it
              is a class, not an unmount, or every switch would restart the project. */}
          <div class={output() === 'preview' ? 'preview' : 'preview hidden'} ref={(el: HTMLDivElement) => (previewEl = el)} />
          {/* One viewer behind every tab that is not the preview: compiled, html, css, ssr. */}
          <div
            class={output() === 'preview' ? 'compiled hidden' : 'compiled'}
            ref={(el: HTMLDivElement) => (compiledHost = el)}
          />
        </div>
        <div
          class="splitter row"
          role="separator"
          aria-orientation="horizontal"
          title="Drag to resize"
          ref={(el: HTMLDivElement) => el.addEventListener('pointerdown', startRowDrag)}
        />
        <div class="r-graph">
          <div class="panel-bar">
            <span>reactive graph</span>
            <span class="stats">
              {stats().nodes} nodes · {stats().edges} edges · {stats().runs} recomputes
            </span>
            <span class="zoom">
              <button type="button" title="Zoom out" onClick={() => view?.zoomBy(1 / 1.25)}>
                −
              </button>
              <button type="button" title="Reset (or double-click the graph)" onClick={() => view?.resetView()}>
                ⤢
              </button>
              <button type="button" title="Zoom in" onClick={() => view?.zoomBy(1.25)}>
                +
              </button>
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
