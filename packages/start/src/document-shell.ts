import {
  createComponent,
  createDynamicElement,
  getLocals,
  renderToString,
  type ComponentChild,
  type RequestLocals,
} from '@fluixi/dom';

/** What a document component receives: the request it renders for. */
export interface DocumentProps {
  request: Request;
  url: URL;
  /** What middleware put on the request's locals. */
  locals: RequestLocals;
}

/** The files the page loads, as URLs: the client entry, its styles and the chunks it imports. */
export interface DocumentAssets {
  scripts: string[];
  styles: string[];
  preloads: string[];
  /** Inline scripts that go first in the head, as code: the event capture in a build. */
  inline?: string[];
}

/** One document render, read by the parts while it runs. */
interface Rendering {
  mountId: string;
  assets: DocumentAssets;
  main: boolean;
}

let rendering: Rendering | null = null;

function current(part: string): Rendering {
  if (!rendering) {
    throw new Error(`<${part} /> renders only in the document component (@fluixi/start/document), on the server.`);
  }
  return rendering;
}

/** The page's `<html>` element. Its attributes are the server's; `seo()` still sets its own over them. */
export function Html(props: Record<string, unknown>): Element {
  return createDynamicElement('html', props);
}

/** The page's `<head>`: start's inline scripts, its children, then the styles and preloads start adds. */
export function Head(props: { children?: ComponentChild }): Element {
  const { assets } = current('Head');
  // First, as in index.html: a click while the rest of the page loads is what the capture is for.
  const first = (assets.inline ?? []).map((code) => createDynamicElement('script', { innerHTML: code }));
  const added = [
    ...assets.styles.map((href) => createDynamicElement('link', { rel: 'stylesheet', crossorigin: '', href })),
    ...assets.preloads.map((href) => createDynamicElement('link', { rel: 'modulepreload', crossorigin: '', href })),
  ];
  return createDynamicElement('head', {
    get children() {
      return [first, props.children, added];
    },
  });
}

/** Where the app renders, and the only part of the page that hydrates. */
export function Main(): Element {
  const state = current('Main');
  state.main = true;
  return createDynamicElement('div', { id: state.mountId });
}

/** The client entry. Start places the hydration data and the event capture itself. */
export function Scripts(): Element[] {
  const { assets } = current('Scripts');
  return assets.scripts.map((src) => createDynamicElement('script', { type: 'module', crossorigin: '', src }));
}

/** What `renderDocument` needs besides the component. */
export interface DocumentRender {
  request: Request;
  mountId: string;
  assets: DocumentAssets;
  /** The document's file, named when it renders no `<Main />`. */
  file: string;
}

/**
 * Renders a document component to the page template for one request: the same string
 * `index.html` is, with `<Main />` as the empty mount element, so streaming, the head start
 * adds and the event capture all work on it unchanged. Markup only: nothing hydrates it.
 */
export function renderDocument(Document: (props: DocumentProps) => unknown, input: DocumentRender): string {
  const state: Rendering = { mountId: input.mountId, assets: input.assets, main: false };
  const previous = rendering;
  rendering = state;
  try {
    const url = new URL(input.request.url);
    const html = renderToString(
      () =>
        createComponent(Document as never, {
          request: input.request,
          url,
          get locals() {
            return getLocals();
          },
        }),
      { hydrationKeys: false, event: { request: input.request, url: url.pathname + url.search } },
    );
    if (!state.main) {
      throw new Error(`${input.file} renders no <Main />, so the app has nowhere to go. Put <Main /> inside <body>.`);
    }
    // The compiler marks holes in the templates it builds for the document's elements; nothing
    // hydrates the document, so nothing would ever look for them.
    return `<!DOCTYPE html>${html.replace(/<!--fx\/?-->/g, '')}`;
  } finally {
    rendering = previous;
  }
}
