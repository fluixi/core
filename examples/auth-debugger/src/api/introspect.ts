/**
 * Introspection, which has to happen here rather than in the browser.
 *
 * RFC 7662 endpoints are authenticated, so asking one requires this service's own
 * credentials, and those must not reach a page.
 */
import {
  createTokenIntrospector,
  credentialsFromEnv,
  explainCredentials,
} from '@fluixi/oauth2/verify';
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

  try {
    const credentials = await credentialsFromEnv({
      prefix: provider!,
      clientId: found.serverClientId ?? found.clientId,
    });
    if (!credentials) {
      return Response.json(
        { error: 'not configured', detail: explainCredentials({ prefix: provider!, label: found.label }) },
        { status: 501 },
      );
    }

    const introspect = createTokenIntrospector({
      issuer: found.issuer,
      ...credentials,
      // The debugger reports what the provider said rather than enforcing an audience of its
      // own, so the check that would refuse a token belongs to the caller.
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
