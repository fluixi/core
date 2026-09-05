// Playground app — compiles a multi-file project in-browser, mounts it, and graphs its
// reactivity via @fluixi/devtools. Left = file tree + editor; right = preview + graph.
import { createSignal, onMount } from '@fluixi/core';
import { createReactor, createGraphView, DEVTOOLS_CSS, nodeVersion, nodeState, type GraphView } from '@fluixi/devtools';
import { runProject, type RunResult } from './run';
import { KNOWN_SPECIFIERS } from './modules';
import { createEditor, setEditorTheme, setProjectLibs, type CodeEditor } from './editor';
import { examples } from './examples';
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
  const [tab, setTab] = createSignal<'editor' | 'compiled'>('editor');
  const [error, setError] = createSignal<string | null>(null);
  const [compiled, setCompiled] = createSignal('');
  const [shared, setShared] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [theme, setTheme] = createSignal(localStorage.getItem('fluixi-pg-theme') ?? 'dark');
  const [sidebar, setSidebar] = createSignal(localStorage.getItem('fluixi-pg-sidebar') !== 'off');
  const [split, setSplit] = createSignal(Number(localStorage.getItem('fluixi-pg-split')) || 50);
  const [stats, setStats] = createSignal({ nodes: 0, edges: 0, runs: 0 });

  let rootEl!: HTMLDivElement;
  let rightEl!: HTMLElement;
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
  let saveTimer = 0;

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  /** The project as it stands in the editor, which is the source of truth for the text. */
  const snapshot = (): Project => ({
    name: projectName(),
    entry: entry(),
    files: files().map((f) => ({ path: f.path, code: editor?.read(f.path) || f.code })),
  });

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
    current = await runProject(project, previewEl, reactor);
    setError(current.error);
    setCompiled(current.compiled.get(openPath()) ?? current.compiled.get(project.entry) ?? '');
    loop();
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
    setTab('editor');
    void run();
  }

  function openFile(path: string) {
    setOpenPath(path);
    editor.open(path, files().find((f) => f.path === path)?.code ?? '');
    setTab('editor');
    requestAnimationFrame(() => editor.layout());
    if (current) setCompiled(current.compiled.get(path) ?? '');
  }

  function addFile() {
    const name = prompt('New file', 'Component.tsx');
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
              files().map((file) => (
                <li class={openPath() === file.path ? 'file on' : 'file'}>
                  <button class="file-open" onClick={() => openFile(file.path)}>
                    <span class="file-name">{file.path}</span>
                    {() => (entry() === file.path ? <span class="badge">entry</span> : null)}
                  </button>
                  <span class="file-actions">
                    {() =>
                      entry() === file.path ? null : (
                        <button
                          class="icon"
                          title="Make this the entry"
                          onClick={() => {
                            setEntry(file.path);
                            persist();
                          }}
                        >
                          ▸
                        </button>
                      )
                    }
                    <button class="icon" title="Rename" onClick={() => renameFile(file.path)}>
                      ✎
                    </button>
                    <button class="icon" title="Delete" onClick={() => removeFile(file.path)}>
                      ×
                    </button>
                  </span>
                </li>
              ))
            }
          </ul>
        </div>

        <div class="pane">
          <div class="tabs-bar">
            <div class="tabs">
              <button
                class={tab() === 'editor' ? 't on' : 't'}
                onClick={() => {
                  setTab('editor');
                  requestAnimationFrame(() => editor?.layout());
                }}
              >
                {() => openPath() || 'Editor'}
              </button>
              <button class={tab() === 'compiled' ? 't on' : 't'} onClick={() => setTab('compiled')}>
                Compiled
              </button>
            </div>
            <button class="run" onClick={() => void run()}>
              ▶ Run <span class="kbd">⌘↵</span>
            </button>
          </div>
          <div
            class={tab() === 'editor' ? 'editor' : 'editor hidden'}
            ref={(el: HTMLDivElement) => (editorHost = el)}
          />
          <pre class={tab() === 'compiled' ? 'compiled' : 'compiled hidden'}>{compiled()}</pre>
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
            <span>preview</span>
          </div>
          <div class="preview" ref={(el: HTMLDivElement) => (previewEl = el)} />
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
