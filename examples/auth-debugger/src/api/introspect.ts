/**
 * Introspection, which has to happen here rather than in the browser.
 *
 * RFC 7662 endpoints are authenticated, so asking one requires this service's own
 * credentials. Those live in the environment and must not reach a page.
 */
import { createTokenIntrospector } from '@fluixi/oauth2/verify';
import { PROVIDERS, type ProviderId } from '../lib/providers.js';

export async function POST(request: Request): Promise<Response> {
  const { provider, token } = (await request.json().catch(() => ({}))) as {
    provider?: ProviderId;
    token?: string;
  };

  const found = provider ? PROVIDERS[provider] : undefined;
  if (!found || !token) {
    return Response.json({ error: 'give a known provider and a token' }, { status: 400 });
  }

  const upper = provider!.toUpperCase();
  // The provider's own client secret serves, since introspection only needs credentials
  // that authenticate the caller. A separate pair is for a provider that wants a
  // different client to ask.
  const clientId = process.env[`${upper}_INTROSPECT_CLIENT_ID`] ?? found.serverClientId ?? found.clientId;
  const clientSecret =
    process.env[`${upper}_INTROSPECT_SECRET`] ?? process.env[`${upper}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) {
    return Response.json(
      {
        error: 'not configured',
        detail: `Introspection authenticates its caller, so ${found.label} needs a secret. Set ${upper}_CLIENT_SECRET, or ${upper}_INTROSPECT_CLIENT_ID and ${upper}_INTROSPECT_SECRET for a different client.`,
      },
      { status: 501 },
    );
  }

  try {
    const introspect = createTokenIntrospector({
      issuer: found.issuer,
      clientId,
      clientSecret,
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
