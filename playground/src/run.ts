// Run a project in an iframe holding its own document.
//
// The preview used to be the body of index.html injected into a div, which threw away the
// head, any <style>, and everything on <body> — `style="background: red"` there did nothing.
// An iframe is the honest thing: the project's html is the document and its script is the
// entry, exactly as vite would serve it.
//
// The framework loads inside that document too, from src/preview/bootstrap.ts. Handing it in
// from here would bind event delegation to the outer document, and the preview would render
// and then ignore every click.
import { linkProject } from './link';
import { createRegistry } from './modules';
import { HTML_SHELL, type Project } from './project';
import type { Reactor } from '@fluixi/devtools';

export interface RunResult {
  error: string | null;
  compiled: Map<string, string>;
  /** The reactor that ran the project. It lives in the iframe, so the graph does too. */
  reactor: Reactor | null;
  dispose: () => void;
}

const FALLBACK_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head><body><div id="app"></div></body></html>`;

/** The project's document, with its own module script removed — the entry is injected. */
function documentFor(project: Project): string {
  const shell = project.files.find((f) => f.path === HTML_SHELL);
  const html = shell?.code ?? FALLBACK_HTML;
  return html.replace(/<script[^>]*type=["']module["'][\s\S]*?<\/script>/gi, '');
}

interface PreviewWindow extends Window {
  __fxEntry?: string;
  __fxReactor?: Reactor;
  __fxError?: string;
}

export async function runProject(project: Project, host: HTMLElement): Promise<RunResult> {
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
    return { error: 'The preview frame did not open.', compiled, reactor: null, dispose: () => frame.remove() };
  }

  try {
    // The registry is rebuilt inside the frame; this copy only supplies the export names the
    // shims re-export, which are the same either side.
    const linked = await linkProject(project, createRegistry({}));
    compiled = linked.compiled;
    revoke = linked.revoke;

    doc.open();
    doc.write(documentFor(project));
    doc.close();

    win.__fxEntry = linked.entryUrl;

    await new Promise<void>((resolve) => {
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = new URL('/src/preview/bootstrap.ts', location.origin).href;
      script.onload = () => resolve();
      script.onerror = () => {
        error = 'The preview could not start.';
        resolve();
      };
      doc.body.appendChild(script);
    });

    // The bootstrap publishes its reactor once the entry has run, or says why it could not.
    for (let i = 0; i < 150 && !win.__fxReactor; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    error ??= win.__fxError ?? null;
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  const reactor = win.__fxReactor ?? null;

  return {
    error,
    compiled,
    reactor,
    dispose() {
      try {
        reactor?.dispose();
      } catch {
        /* the frame may already be gone */
      }
      frame.remove();
      revoke();
    },
  };
}
