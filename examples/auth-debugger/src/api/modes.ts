/**
 * Which providers have a server-held session available, and why not where they do not.
 *
 * Only the server knows: the secrets that enable one are deliberately absent from the
 * browser bundle. Reporting the reason as well as the answer keeps a missing variable from
 * looking like a broken route.
 */
import { serverReadyProviders } from '../middleware.js';
import { needsSetup, PROVIDERS } from '../lib/providers.js';

export function GET(): Response {
  const detail = Object.values(PROVIDERS).map((p) => {
    const secretName = `${p.id.toUpperCase()}_CLIENT_SECRET`;
    const missing: string[] = [];
    if (needsSetup(p)) missing.push('issuer and client id are still placeholders');
    if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET is not set');
    if (!process.env[secretName]) missing.push(`${secretName} is not set`);
    return { id: p.id, ready: missing.length === 0, missing };
  });

  // Asked of the middleware rather than decided again here, so the answer cannot drift
  // from what is actually mounted.
  return Response.json({ server: serverReadyProviders(), detail });
}
