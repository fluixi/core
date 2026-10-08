/**
 * A thrown refusal, answered with its own status.
 *
 * `requireUser` and its siblings in `@fluixi/auth/server` throw an error carrying 401 or 403,
 * and an app's own code refuses the same way: `Object.assign(new Error(code), { status: 422,
 * code, details })`. Left to the generic handler each became a 500 whose body was the
 * message, so a refusal the caller can act on looked like a server fault. Matched by shape
 * rather than class, so this package does not depend on the auth one; any error without a
 * 4xx status is left where it was.
 */
const NAMES: Record<number, string> = { 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 409: 'conflict' };

export function refusalResponse(error: unknown): Response | null {
  const e = error as { status?: unknown; code?: unknown; details?: unknown; redirectTo?: unknown } | null;
  if (!e || typeof e.status !== 'number' || e.status < 400 || e.status > 499) return null;
  const body: Record<string, unknown> = { error: NAMES[e.status] ?? 'refused' };
  if (typeof e.code === 'string') body.code = e.code;
  if (e.details && typeof e.details === 'object') body.details = e.details;
  if (typeof e.redirectTo === 'string') body.redirectTo = e.redirectTo;
  return new Response(JSON.stringify(body), {
    status: e.status,
    headers: { 'content-type': 'application/json' },
  });
}
