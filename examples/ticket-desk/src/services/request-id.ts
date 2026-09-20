/**
 * The request id, shared between the middleware that mints it and the render that
 * displays it.
 *
 * Keyed by the `Request` object in a WeakMap rather than held in a module variable,
 * because a module variable is one slot shared by every in-flight request and would hand
 * the wrong id to a concurrent render. The map entry disappears when the request is
 * collected.
 */
const ids = new WeakMap<Request, string>();

export function newRequestId(): string {
  return `req-${Math.random().toString(36).slice(2, 10)}`;
}

export function rememberRequestId(request: Request, id: string): void {
  ids.set(request, id);
}

export function requestIdFor(request: Request | undefined): string | undefined {
  return request ? ids.get(request) : undefined;
}
