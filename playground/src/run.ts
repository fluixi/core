// Run a project in an iframe holding its own document.
//
// The preview used to be the body of index.html injected into a div, which threw away the
// head, any <style>, and everything on <body>: `style="background: red"` there did nothing.
// An iframe is the honest thing: the project's html is the document and its script is the
// entry, exactly as vite would serve it.
//
// The framework loads inside that document too, from src/preview/bootstrap.ts. Handing it in
// from here would bind event delegation to the outer document, and the preview would render
// and then ignore every click.
import { linkProject } from './link';
import { createRegistry } from './modules';
import { HTML_SHELL, normalizePath, type Project } from './project';
import type { ObservedGraph } from '@fluixi/devtools';

/**
 * Where the iframe loads its bootstrap from.
 *
 * The dev server compiles the module on request; a build emits it as an entry of its own,
 * under a name that is not hashed so this can say it without reading a manifest. Getting
 * this wrong is quiet: a static host answers an unknown path with index.html, and the
 * iframe refuses it for its mime type rather than for being the wrong file.
 */
const bootstrapUrl = (): string => {
  const path = import.meta.env.DEV ? 'src/preview/bootstrap.ts' : 'preview/bootstrap.js';
  return new URL(`${import.meta.env.BASE_URL}${path}`, location.origin).href;
};

export interface RunResult {
  error: string | null;
  compiled: Map<string, string>;
  /** The graph of the run. It is watched from inside the iframe, so it lives there too. */
  graph: ObservedGraph | null;
  /** The document as it stands now: the shell plus whatever the app put in it. */
  html(): string;
  /** The stylesheets the run pulled in, in the order they landed. */
  css(): string;
  /** What the server pass produced, in ssr mode. */
  ssr(): string;
  dispose: () => void;
}

const FALLBACK_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head><body><div id="app"></div></body></html>`;

/** The project's document, with its own module script removed, the entry is injected. */
/** `href="./styles.css"` in the shell, pointing at a project file. */
const ASSET_REF = /(\b(?:href|src)\s*=\s*)(["'])([^"']+)\2/gi;

function documentFor(project: Project, assets: Map<string, string>): string {
  const shell = project.files.find((f) => f.path === HTML_SHELL);
  const html = shell?.code ?? FALLBACK_HTML;
  const withoutEntry = html.replace(/<script[^>]*type=["']module["'][\s\S]*?<\/script>/gi, '');
  // The preview document is written, not served, so a relative path in it resolves against
  // the playground rather than the project. Anything naming a project file becomes its blob.
  return withoutEntry.replace(ASSET_REF, (whole, lead: string, quote: string, ref: string) => {
    const target = normalizePath(ref.replace(/^\.?\//, ''));
    const url = assets.get(target);
    return url ? `${lead}${quote}${url}${quote}` : whole;
  });
}

interface PreviewWindow extends Window {
  __fxEntry?: string;
  __fxOrigin?: (file: string, at: { line: number; column: number }) => { line: number; column: number } | undefined;
  __fxMode?: RenderMode;
  __fxSsrHtml?: string;
  __fxGraph?: ObservedGraph;
  __fxError?: string;
}

/** Client render, or server html handed to the client to take over. */
export type RenderMode = 'spa' | 'ssr';

export async function runProject(
  project: Project,
  host: HTMLElement,
  mode: RenderMode = 'spa',
): Promise<RunResult> {
  host.innerHTML = '';

  let compiled = new Map<string, string>();
  let revoke: () => void = () => {};
  let error: string | null = null;

  const frame = document.createElement('iframe');
  frame.className = 'preview-frame';
  frame.setAttribute('title', 'Preview');
  host.appendChild(frame);

  const win = frame.contentWindow as PreviewWindow | null;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    return {
      error: 'The preview frame did not open.',
      compiled,
      graph: null,
      html: () => '',
      css: () => '',
      ssr: () => '',
      dispose: () => frame.remove(),
    };
  }

  try {
    // The registry is rebuilt inside the frame; this copy only supplies the export names the
    // shims re-export, which are the same either side.
    const linked = await linkProject(project, createRegistry());
    compiled = linked.compiled;
    revoke = linked.revoke;

    doc.open();
    doc.write(documentFor(project, linked.assets));
    doc.close();

    win.__fxEntry = linked.entryUrl;
    win.__fxMode = mode;
    // A function, not the maps: the iframe is same-origin and the data stays in one place.
    win.__fxOrigin = linked.origin;

    await new Promise<void>((resolve) => {
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = bootstrapUrl();
      script.onload = () => resolve();
      script.onerror = () => {
        error = 'The preview could not start.';
        resolve();
      };
      doc.body.appendChild(script);
    });

    // The bootstrap publishes its graph once the entry has run, or says why it could not.
    for (let i = 0; i < 150 && !win.__fxGraph; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    error ??= win.__fxError ?? null;
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  const graph = win.__fxGraph ?? null;

  return {
    error,
    compiled,
    graph,
    html() {
      const el = frame.contentDocument?.documentElement;
      return el ? `<!DOCTYPE html>\n${el.outerHTML}` : '';
    },
    css() {
      const doc = frame.contentDocument;
      if (!doc) return '';
      // What actually applied: the styles an `import './x.css'` injected, plus anything the
      // shell linked, each still named so a project with several is readable.
      const blocks: string[] = [];
      for (const style of doc.querySelectorAll('style')) {
        const from = style.getAttribute('data-fx-style');
        blocks.push(from ? `/* ${from} */\n${style.textContent ?? ''}` : (style.textContent ?? ''));
      }
      for (const file of project.files) {
        if (!file.path.endsWith('.css') || blocks.some((b) => b.startsWith(`/* ${file.path} */`))) continue;
        if (doc.querySelector(`link[rel="stylesheet"]`)) blocks.push(`/* ${file.path} */\n${file.code}`);
      }
      return blocks.join('\n\n').trim();
    },
    ssr() {
      return win.__fxSsrHtml ?? '';
    },
    dispose() {
      try {
        graph?.detach();
      } catch {
        /* the frame may already be gone */
      }
      frame.remove();
      revoke();
    },
  };
}
