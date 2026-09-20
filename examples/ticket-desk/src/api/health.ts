// GET /api/health — the liveness probe. No DI, nothing to inject: it must answer even
// when the rest of the app cannot.
export function GET() {
  return { ok: true, at: new Date().toISOString() };
}
