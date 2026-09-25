/**
 * Introspection, which has to happen here rather than in the browser.
 *
 * RFC 7662 endpoints are authenticated, so asking one requires this service's own
 * credentials. Those live in the environment and must not reach a page.
 */
import { createTokenIntrospector } from '@fluixi/oauth2/verify';
import { PROVIDERS, type ProviderId } from '../lib/providers.js';
import { credentialsFor, howToConfigure, type Credentials } from '../lib/credentials.js';

export async function POST(request: Request): Promise<Response> {
  const { provider, token } = (await request.json().catch(() => ({}))) as {
    provider?: ProviderId;
    token?: string;
  };

  const found = provider ? PROVIDERS[provider] : undefined;
  if (!found || !token) {
    return Response.json({ error: 'give a known provider and a token' }, { status: 400 });
  }

  let credentials: Credentials | null;
  try {
    credentials = credentialsFor(provider!, found.serverClientId ?? found.clientId);
  } catch (cause) {
    // A key that is named but unreadable is a configuration mistake, not an absent one.
    return Response.json(
      { error: 'not configured', detail: cause instanceof Error ? cause.message : String(cause) },
      { status: 501 },
    );
  }

  if (!credentials) {
    return Response.json(
      { error: 'not configured', detail: howToConfigure(provider!, found.label) },
      { status: 501 },
    );
  }

  try {
    const introspect = createTokenIntrospector({
      issuer: found.issuer,
      ...credentials,
      // The debugger reports what the provider said rather than enforcing an audience of
      // its own, so the check that would refuse a token belongs to the caller.
      audience: false,
    });
    return Response.json(await introspect(token));
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : String(cause) },
      { status: 400 },
    );
  }
}
