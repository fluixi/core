/**
 * Reading what a request carries, before any schema sees it.
 */
import { ApiError } from './errors.js';

/** 1 MiB. A JSON API rarely needs more; files go to storage directly, not through a route. */
export const DEFAULT_BODY_LIMIT = 1024 * 1024;

/**
 * The query string as a plain object: `?a=1` is `{ a: '1' }`, and a repeated key becomes an
 * array, `?tag=x&tag=y` is `{ tag: ['x', 'y'] }`. Schemas coerce from there.
 */
export function readQuery(url: URL): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const seen = out[key];
    if (seen === undefined) out[key] = value;
    else out[key] = Array.isArray(seen) ? [...seen, value] : [seen, value];
  }
  return out;
}

/**
 * The JSON body, or `undefined` when there is none.
 *
 * The size limit is checked on the bytes read, not only on `Content-Length`, which a client can
 * leave out or get wrong: reading stops at the limit instead of buffering whatever arrives.
 */
export async function readJson(request: Request, limit = DEFAULT_BODY_LIMIT): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw tooLarge(limit);
  if (!request.body) return undefined;

  const type = request.headers.get('content-type') ?? '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw tooLarge(limit);
    }
    chunks.push(value);
  }
  if (size === 0) return undefined;
  if (!isJson(type)) {
    throw new ApiError(415, 'unsupported_media_type', 'Send the body as application/json.');
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, 'invalid_json', 'The body is not valid JSON.');
  }
}

function isJson(type: string): boolean {
  const mime = type.split(';')[0]!.trim().toLowerCase();
  return mime === 'application/json' || mime.endsWith('+json');
}

function tooLarge(limit: number): ApiError {
  return new ApiError(413, 'payload_too_large', `The body is larger than ${limit} bytes.`);
}
