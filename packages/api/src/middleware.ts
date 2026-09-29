/**
 * The shape of `@fluixi/start` middleware, restated so this package does not import start:
 * `(request, next)` to a `Response`, where `next()` runs the rest of the chain.
 */
export type Middleware = (request: Request, next: () => Promise<Response>) => Response | Promise<Response>;

/** Headers set on a response, cloning it first when its headers are immutable (a fetched one). */
export function withHeaders(response: Response, set: (headers: Headers) => void): Response {
  try {
    set(response.headers);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    set(copy.headers);
    return copy;
  }
}

export function appendVary(headers: Headers, name: string): void {
  const vary = headers.get('vary');
  if (!vary) headers.set('vary', name);
  else if (!vary.split(',').some((v) => v.trim().toLowerCase() === name.toLowerCase())) headers.set('vary', `${vary}, ${name}`);
}
