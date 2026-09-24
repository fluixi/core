/**
 * A provider's discovery document, fetched here rather than in the page.
 *
 * Not every provider lets a browser read it: Keycloak does once an origin is configured,
 * Dex and Google do not. A server has no such restriction, so the capability panel asks
 * this instead of the provider and works the same for all five.
 */
import { capabilitiesOf } from '../lib/inspect.js';
import { needsSetup, PROVIDERS, type ProviderId } from '../lib/providers.js';

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('provider') as ProviderId | null;
  const provider = id ? PROVIDERS[id] : undefined;

  if (!provider) return Response.json({ error: 'unknown provider' }, { status: 400 });
  if (needsSetup(provider)) {
    return Response.json({ error: 'this provider still has placeholder values' }, { status: 409 });
  }

  try {
    return Response.json(await capabilitiesOf(provider.issuer));
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : String(cause) },
      { status: 502 },
    );
  }
}
