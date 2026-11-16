/**
 * The runtime-neutral request layer. Everything renders through a Web
 * `Request → Response` handler, so the same core works in Node, Bun, Deno, and
 * edge/worker runtimes: only the *bridge* (Node http here) is platform-specific.
 * This is the seam deploy adapters plug into.
 */
import { errorResponse, liftHead, type ErrorResponseOptions } from './document.js';
import { withPlatformRequest } from './platform-request.js';
import { takeResponseHeaders, takeResponseRedirect, takeResponseStatus } from '@fluixi/dom';

/** Produce page HTML for a request URL (pathname + search). */
export type RenderFn = (url: string, request: Request) => string | Promise<string>;

/** Web-standard request handler. */
export type FetchHandler = (request: Request) => Promise<Response>;

/** Produce a web `ReadableStream` of the app body (no document shell) for a URL. */
export type StreamRenderFn = (
  url: string,
  request: Request,
) => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;

/**
 * Compose a streamed HTML Response: `head` once the body's head marker is known, then the app
 * `body` stream into the mount point, then `tail` (client script + closing tags).
 *
 * Resolves only when the head can go out. Nothing is flushed before that anyway, so waiting
 * costs nothing, and it leaves the response headers open until then: a cookie set while the
 * shell rendered still reaches them. A body that fails before that rejects, which the caller
 * turns into a real 500; a failure after it can only cut the stream short.
 */
export async function streamDocument(
  head: string,
  body: ReadableStream<Uint8Array>,
  tail: string,
  request?: Request,
): Promise<Response> {
  const enc = new TextEncoder();
  // The head waits for the body's opening marker: once flushed it cannot change, and
  // the marker is where seo() puts the page's title and meta. Sent early, every
  // streamed page went out with the template's title, which is what a crawler reads.
  const reader = body.getReader();
  const { marker, rest } = await readHeadMarker(reader);
  // A route's data that redirected before anything went out: the redirect is the answer.
  const away = request ? takeResponseRedirect(request) : undefined;
  if (away) {
    await reader.cancel().catch(() => {});
    return redirectResponse(away);
  }
  // A status the render asked for (500 for a route that failed and showed its error view).
  const status = (request && takeResponseStatus(request)) ?? 200;
  const lifted = marker ? liftHead(head, marker).html : head;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(enc.encode(lifted));
        if (rest?.length) controller.enqueue(rest);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.enqueue(enc.encode(tail));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
  return new Response(stream, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

const MARKER_OPEN = new TextEncoder().encode('<!--fh:');
const MARKER_CLOSE = new TextEncoder().encode('-->');

function indexOf(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * Read just enough of the body to know whether it opens with a head marker, and all of it
 * when it does. Works on bytes: the marker is ASCII, and decoding the body to find it could
 * split a multibyte character across two chunks.
 */
async function readHeadMarker(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ marker: string | null; rest: Uint8Array | null }> {
  let buf = new Uint8Array(0);
  for (;;) {
    const opens = buf.length >= MARKER_OPEN.length && indexOf(buf.subarray(0, MARKER_OPEN.length), MARKER_OPEN) === 0;
    if (buf.length >= MARKER_OPEN.length && !opens) return { marker: null, rest: buf };
    if (opens) {
      const close = indexOf(buf, MARKER_CLOSE, MARKER_OPEN.length);
      if (close >= 0) {
        const end = close + MARKER_CLOSE.length;
        return { marker: new TextDecoder().decode(buf.subarray(0, end)), rest: buf.subarray(end) };
      }
    }
    const { done, value } = await reader.read();
    if (done) return { marker: null, rest: buf };
    const next = new Uint8Array(buf.length + value.length);
    next.set(buf);
    next.set(value, buf.length);
    buf = next;
  }
}

/**
 * Merges the headers code wrote with `appendResponseHeader` while answering `request` (a
 * cookie set during the render) into `response`. `Set-Cookie` appends; any other header the
 * response already has is left alone.
 */
export function withResponseHeaders(request: Request, response: Response): Response {
  const extra = takeResponseHeaders(request);
  if (!extra) return response;
  let empty = true;
  extra.forEach(() => (empty = false));
  if (empty) return response;
  const merge = (headers: Headers) => {
    for (const cookie of extra.getSetCookie()) headers.append('set-cookie', cookie);
    extra.forEach((value, name) => {
      if (name !== 'set-cookie' && !headers.has(name)) headers.set(name, value);
    });
  };
  try {
    merge(response.headers);
    return response;
  } catch {
    // A fetched or redirect Response has immutable headers: copy it.
    const headers = new Headers(response.headers);
    merge(headers);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
}

/** A route's `redirect()`, as the response; `Location` as given, which may be a path. */
function redirectResponse(redirect: { location: string; status: number }): Response {
  return new Response(null, { status: redirect.status, headers: { location: redirect.location } });
}

/** Wrap a render function as a fetch handler (Node/Bun/Deno/edge-portable). */
export function createRequestHandler(render: RenderFn, options?: ErrorResponseOptions): FetchHandler {
  return async (request) => {
    const url = new URL(request.url);
    try {
      const html = await withPlatformRequest(request, () => render(url.pathname + url.search, request));
      const away = takeResponseRedirect(request);
      if (away) return redirectResponse(away);
      return new Response(html, {
        status: takeResponseStatus(request) ?? 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } catch (e) {
      return errorResponse(e, request, options);
    }
  };
}
