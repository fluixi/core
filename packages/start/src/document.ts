/**
 * Turning a rendered app into a document, and keeping a failed render from taking
 * the process with it.
 *
 * A leaf on purpose: this is imported by the request handler, which runs in a
 * worker as often as on Node, and a runtime module that reaches into the build
 * helpers drags a whole toolchain into the bundle with it.
 */
import { extractHeadMarker } from '@fluixi/head';
import type { FetchHandler } from './handler.js';

/**
 * Inject server-rendered app HTML into the template's mount element
 * (`<div id="root"></div>`). Falls back to a `<!--ssr-outlet-->` marker, then to
 * just before `</body>`.
 */
export function injectApp(template: string, appHtml: string, mountId = 'root'): string {
  const mount = new RegExp(`<div id=["']${mountId}["']\\s*>\\s*</div>`);
  if (mount.test(template)) {
    return template.replace(mount, `<div id="${mountId}">${appHtml}</div>`);
  }
  if (template.includes('<!--ssr-outlet-->')) {
    return template.replace('<!--ssr-outlet-->', appHtml);
  }
  return template.replace('</body>', `<div id="${mountId}">${appHtml}</div></body>`);
}

/**
 * Split the template at the mount point for streaming: `head` is everything up to and
 * including the open mount tag (flushed first so the browser fetches assets while the
 * server awaits data); `tail` is the close tag onward (client script + `</body>`).
 * Mirrors injectApp's three cases (mount div, `<!--ssr-outlet-->`, before `</body>`).
 */
export function splitTemplate(template: string, mountId = 'root'): { head: string; tail: string } {
  const mount = new RegExp(`<div id=["']${mountId}["']\\s*>\\s*</div>`);
  const m = template.match(mount);
  if (m && m.index !== undefined) {
    return {
      head: template.slice(0, m.index) + `<div id="${mountId}">`,
      tail: `</div>` + template.slice(m.index + m[0].length),
    };
  }
  const outlet = template.indexOf('<!--ssr-outlet-->');
  if (outlet !== -1) {
    return {
      head: template.slice(0, outlet),
      tail: template.slice(outlet + '<!--ssr-outlet-->'.length),
    };
  }
  const body = template.indexOf('</body>');
  if (body !== -1) {
    return {
      head: template.slice(0, body) + `<div id="${mountId}">`,
      tail: `</div>` + template.slice(body),
    };
  }
  return { head: template, tail: '' };
}

/**
 * Reference the files this route needs in the document that renders it.
 *
 * A lazily-imported route is its own chunk with its own stylesheet, mentioned nowhere
 * in the shell: without these the browser discovers them when hydration runs the
 * dynamic import, so the markup paints before the CSS arrives.
 *
 * Files already named in the template are skipped: the entry chunk is in there from
 * the client build, and preloading it again competes with the request in flight.
 */
export function injectPreload(template: string, files: string[]): string {
  const tags = files
    .filter((file) => !template.includes(file))
    .map((file) =>
      file.endsWith('.css')
        ? `<link rel="stylesheet" href="${file}">`
        : // `modulepreload` also fetches the chunk's own static imports.
          `<link rel="modulepreload" href="${file}">`,
    );
  if (tags.length === 0) return template;

  // No `</head>` means a fragment, not a document.
  const head = template.indexOf('</head>');
  if (head === -1) return template;
  return template.slice(0, head) + tags.join('') + template.slice(head);
}

/** Set/replace an attribute on the template's <html> tag (e.g. lang). */
function setHtmlAttr(html: string, name: string, value: string): string {
  const existing = new RegExp(`(<html\\b[^>]*?)\\s${name}="[^"]*"`, 'i');
  if (existing.test(html)) return html.replace(existing, `$1 ${name}="${value}"`);
  return html.replace(/<html\b/i, `<html ${name}="${value}"`);
}

/**
 * Inject the rendered app into the mount point AND lift any @fluixi/head metadata (carried back as
 * a marker by renderRequestAsync) into <head> + <html>. If the page set a title, the template's own
 * <title> is dropped so there's only one. No marker → identical to injectApp.
 */
export function injectAppAndHead(template: string, rendered: string, mountId = 'root'): string {
  const { head, body } = extractHeadMarker(rendered);
  let html = injectApp(template, body, mountId);
  if (head) {
    if (head.headHtml) {
      if (/<title[\s>]/i.test(head.headHtml)) html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
      html = html.replace('</head>', `${head.headHtml}</head>`);
    }
    for (const [k, v] of Object.entries(head.htmlAttrs)) html = setHtmlAttr(html, k, v);
  }
  return html;
}

/**
 * Wrap a fetch handler so a thrown/rejected error becomes a 500 instead of an
 * unhandled rejection. `createRequestHandler` already guards the renderer; this
 * covers the middleware chain that wraps it. `onError` lets dev map the stack first.
 */
export function guardHandler(
  handler: FetchHandler,
  onError?: (e: unknown) => void,
): FetchHandler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (e: any) {
      onError?.(e);
      return new Response(String(e?.stack || e), {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  };
}

