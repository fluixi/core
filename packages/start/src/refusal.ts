/**
 * A thrown refusal, answered with its own status.
 *
 * `requireUser` and its siblings in `@fluixi/auth/server` throw an error carrying 401 or 403.
 * Left to the generic handler it became a 500 whose body was the message, so a signed-out
 * caller looked like a server fault. Matched by shape rather than class, so this package does
 * not depend on the auth one; any other error is left where it was.
 */
export function refusalResponse(error: unknown): Response | null {
  const e = error as { status?: unknown; redirectTo?: unknown } | null;
  if (!e || (e.status !== 401 && e.status !== 403)) return null;
  const body: Record<string, string> = { error: e.status === 401 ? 'unauthorized' : 'forbidden' };
  if (typeof e.redirectTo === 'string') body.redirectTo = e.redirectTo;
  return new Response(JSON.stringify(body), {
    status: e.status,
    headers: { 'content-type': 'application/json' },
  });
}
