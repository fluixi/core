/**
 * What a provider actually does, checked against what this package assumes.
 *
 * One suite, a config block per provider. Adding a provider is filling in the block
 * rather than writing another script, which is the point: the five scripts this replaces
 * each tested one provider and drifted apart.
 *
 * The output is a capability matrix. A row that fails is not always a defect here, it is
 * often a provider that does something differently and a note the docs should carry, so
 * the report separates the two.
 *
 *   node conformance/run.mjs keycloak
 *   node conformance/run.mjs --all
 *
 * Checks come in two tiers. Everything in tier one runs unattended anywhere: discovery,
 * the client credentials grant, JWKS verification, introspection, revocation. Tier two
 * needs a user, so it runs only where the config says how to get one without a browser.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../dist');

const { createBrowserClient } = await import(`${DIST}/index.mjs`);
const { createServiceClient } = await import(`${DIST}/service-client.mjs`);
const { createTokenVerifier, createTokenIntrospector } = await import(`${DIST}/verify.mjs`);

// ─── reporting ────────────────────────────────────────────────────────────────

const results = [];
const record = (area, name, status, detail = '') =>
  results.push({ area, name, status, detail });

/** A check that must hold. A failure here is a defect in this package. */
async function must(area, name, fn) {
  try {
    const detail = await fn();
    record(area, name, 'pass', typeof detail === 'string' ? detail : '');
  } catch (error) {
    record(area, name, 'fail', error?.message ?? String(error));
  }
}

/**
 * A capability that may legitimately be absent.
 *
 * Not every provider publishes an introspection endpoint or allows a password grant, and
 * treating that as a failure would bury the ones that matter.
 */
async function capability(area, name, fn) {
  try {
    const detail = await fn();
    record(area, name, 'yes', typeof detail === 'string' ? detail : '');
  } catch (error) {
    // Not truncated, for the reason in `must`: a capability that is absent because of a
    // setting reads exactly like one the provider does not have, and only the provider's
    // own words tell them apart.
    record(area, name, 'no', error?.message ?? String(error));
  }
}

// ─── a browser, as far as the client is concerned ─────────────────────────────

function fakeBrowser() {
  const store = new Map();
  let navigated = null;
  globalThis.window = {
    sessionStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  };
  globalThis.window.localStorage = globalThis.window.sessionStorage;
  globalThis.location = {
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    href: 'http://localhost:3000/',
    assign: (url) => {
      navigated = url;
    },
  };
  return { store, navigated: () => navigated };
}

/** The claims of a JWT, or null when the token is opaque. */
function claimsOf(token) {
  const parts = String(token).split('.');
  if (parts.length < 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Resolve `env:NAME` to the environment, anything else to itself.
 *
 * A real tenant's client secret does not belong in a file that sits in a repository, so
 * a config names the variable and the value stays outside. Local throwaway providers can
 * still write the value inline.
 */
function resolveSecrets(value) {
  if (typeof value === 'string') {
    if (!value.startsWith('env:')) return value;
    const name = value.slice(4);
    const found = process.env[name];
    if (!found) throw new Error(`${value} is referenced by the config but ${name} is not set`);
    return found;
  }
  if (Array.isArray(value)) return value.map(resolveSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveSecrets(v)]));
  }
  return value;
}

// ─── the suite ────────────────────────────────────────────────────────────────

async function runProvider(name, cfg) {
  console.log(`\n${'─'.repeat(72)}\n  ${name}  ${cfg.issuer}\n${'─'.repeat(72)}`);
  results.length = 0;

  // ── discovery ───────────────────────────────────────────────────────────────
  let doc = {};
  await must('discovery', 'serves a discovery document', async () => {
    const response = await fetch(`${cfg.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    doc = await response.json();
    return doc.issuer;
  });

  await must('discovery', 'names its own issuer', () => {
    if (!doc.issuer) throw new Error('no issuer field');
    // A mismatch is legal for a provider templating a tenant into the value, and is the
    // reason the verifier accepts a list rather than one string.
    return doc.issuer === cfg.issuer ? 'matches the configured value' : `differs: ${doc.issuer}`;
  });

  for (const [label, field] of [
    ['authorization', 'authorization_endpoint'],
    ['token', 'token_endpoint'],
    ['jwks', 'jwks_uri'],
  ]) {
    await must('discovery', `publishes the ${label} endpoint`, () => {
      if (!doc[field]) throw new Error(`no ${field}`);
      return '';
    });
  }

  for (const [label, field] of [
    ['userinfo', 'userinfo_endpoint'],
    ['end session', 'end_session_endpoint'],
    ['introspection', 'introspection_endpoint'],
    ['revocation', 'revocation_endpoint'],
  ]) {
    await capability('discovery', `publishes the ${label} endpoint`, () => {
      if (!doc[field]) throw new Error('absent');
      return '';
    });
  }

  await capability('discovery', 'advertises S256 PKCE', () => {
    const methods = doc.code_challenge_methods_supported ?? [];
    if (!methods.includes('S256')) throw new Error(`advertises ${methods.join(', ') || 'nothing'}`);
    return '';
  });

  // ── the service grant ───────────────────────────────────────────────────────
  let serviceToken = null;
  if (cfg.service) {
    const svc = createServiceClient({
      issuer: cfg.issuer,
      clientId: cfg.service.clientId,
      clientSecret: cfg.service.clientSecret,
      scopes: cfg.service.scopes,
      audience: cfg.service.audience,
      clientAuthMethod: cfg.service.clientAuthMethod,
    });

    await must('service', 'client_credentials grant', async () => {
      serviceToken = await svc.token();
      return serviceToken.slice(0, 12) + '…';
    });

    await must('service', 'reuses a token that is still good', async () => {
      const again = await svc.token();
      if (again !== serviceToken) throw new Error('fetched a second time');
      return '';
    });

    if (serviceToken) {
      await capability('service', 'the token is a JWT', () => {
        if (!claimsOf(serviceToken)) throw new Error('opaque');
        return '';
      });
    }
  }

  // ── what a token carries ────────────────────────────────────────────────────
  const shapeOf = (token, area) => {
    const claims = claimsOf(token);
    if (!claims) {
      record(area, 'token format', 'note', 'opaque, so only introspection can read it');
      return null;
    }
    record(area, 'token format', 'note', 'JWT');
    record(area, 'carries aud', claims.aud ? 'yes' : 'no',
      claims.aud ? JSON.stringify(claims.aud) : 'so audience: false plus authorizedParty');
    record(area, 'names the client', claims.azp ? 'yes' : claims.client_id ? 'yes' : 'no',
      claims.azp ? 'azp' : claims.client_id ? 'client_id' : 'neither');
    record(area, 'carries sub', claims.sub ? 'yes' : 'no',
      claims.sub ? '' : 'a lightweight token: identity must come from userinfo');
    return claims;
  };

  if (serviceToken) shapeOf(serviceToken, 'service token');


  // ── the user flow ───────────────────────────────────────────────────────────
  let userTokens = null;
  let spentCode = null;
  /** Which client the user token belongs to, which is what may refresh or revoke it. */
  let tokenClient = { clientId: cfg.client.clientId, clientSecret: cfg.client.clientSecret };
  if (cfg.user?.passwordGrant) {
    // The direct grant is not how an app should sign anyone in, and it is the only way
    // to get a user token here without driving a login form.
    await must('user flow', 'obtains a user token for the checks below', async () => {
      // Auth0 refuses this grant to a single page application, because a public client
      // cannot authenticate itself. The config can name a confidential one for the grant
      // while the redirect flow keeps using the SPA.
      const grantClient = {
        clientId: cfg.user.clientId ?? cfg.client.clientId,
        clientSecret: cfg.user.clientSecret ?? cfg.client.clientSecret,
      };
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: grantClient.clientId,
        username: cfg.user.username,
        password: cfg.user.password,
        scope: (cfg.client.scopes ?? ['openid', 'profile', 'email']).join(' '),
      });
      if (grantClient.clientSecret) body.set('client_secret', grantClient.clientSecret);
      // Auth0 answers with an opaque token unless an API is named, and then there is no
      // JWT for the verification checks below to look at.
      if (cfg.client.audience) body.set('audience', cfg.client.audience);
      // Auth0's own realm variant, for a tenant that has not set a default directory.
      if (cfg.user.realm) {
        body.set('grant_type', 'http://auth0.com/oauth/grant-type/password-realm');
        body.set('realm', cfg.user.realm);
      }

      const ask = async (params) => {
        const response = await fetch(doc.token_endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params,
        });
        return { ok: response.ok, status: response.status, text: await response.text() };
      };

      tokenClient = grantClient;
      let attempt = await ask(body);

      // Naming an API can be refused for this grant even when the same client may use it
      // with client_credentials, which is what Auth0 does. Dropping the audience gets a
      // token that is opaque rather than a JWT, so userinfo and the id token can still be
      // checked while the JWT rows below simply do not apply.
      let degraded = '';
      if (!attempt.ok && body.has('audience')) {
        const withoutAudience = new URLSearchParams(body);
        withoutAudience.delete('audience');
        const second = await ask(withoutAudience);
        if (second.ok) {
          attempt = second;
          degraded = ', without an audience, so the access token is opaque';
        }
      }

      if (!attempt.ok) {
        // The whole body: a provider explains a refusal here and nowhere else.
        throw new Error(`HTTP ${attempt.status} ${attempt.text}`);
      }
      userTokens = JSON.parse(attempt.text);
      return `via the password grant, which is a test mechanism and not a login${degraded}`;
    });
  }

  if (cfg.user?.form) {
    await must('user flow', 'authorization code with PKCE, through the login form', async () => {
      const browser = fakeBrowser();
      const client = createBrowserClient({
        mode: 'browser',
        issuer: cfg.issuer,
        clientId: cfg.client.clientId,
        redirectUri: cfg.client.redirectUri,
        scopes: cfg.client.scopes,
      });

      const jar = new Map();
      const remember = (r) => {
        for (const raw of r.headers.getSetCookie?.() ?? []) {
          const [pair] = raw.split(';');
          const i = pair.indexOf('=');
          jar.set(pair.slice(0, i), pair.slice(i + 1));
        }
      };

      await client.login();

      // Follow redirects to wherever the form actually lives. Keycloak serves it from
      // the authorize endpoint directly; Dex bounces through a connector-selection URL
      // first, and a harness that stops at the first 302 never sees any HTML.
      let url = browser.navigated();
      let html = '';
      for (let hop = 0; hop < 5; hop++) {
        const page = await fetch(url, {
          redirect: 'manual',
          headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
        });
        remember(page);
        const next = page.headers.get('location');
        if (next && page.status >= 300 && page.status < 400) {
          url = new URL(next, url).toString();
          continue;
        }
        html = await page.text();
        break;
      }

      const action = html.match(new RegExp(cfg.user.form.actionPattern))?.[1]?.replace(/&amp;/g, '&');
      if (!action) throw new Error(`no login form at ${url}`);

      // Relative to the page the form was served from, not to the issuer: Dex's action
      // is a bare path under its own mount.
      const submit = await fetch(new URL(action, url), {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        },
        body: new URLSearchParams({
          [cfg.user.form.usernameField]: cfg.user.username,
          [cfg.user.form.passwordField]: cfg.user.password,
          ...cfg.user.form.extraFields,
        }),
      });
      const location = submit.headers.get('location');
      if (!location?.startsWith(cfg.client.redirectUri)) {
        throw new Error(`no redirect to the callback: HTTP ${submit.status}`);
      }

      const params = new URL(location);
      userTokens = await client.handleCallback({
        code: params.searchParams.get('code'),
        state: params.searchParams.get('state'),
      });
      userTokens = { access_token: userTokens.accessToken, refresh_token: userTokens.refreshToken,
                     id_token: userTokens.idToken };
      spentCode = { code: params.searchParams.get('code'), redirectUri: cfg.client.redirectUri };
      return '';
    });

  }

  if (userTokens?.access_token) {
    shapeOf(userTokens.access_token, 'user token');

    await capability('user flow', 'returns a refresh token', () => {
      if (!userTokens.refresh_token) throw new Error('absent');
      return '';
    });

    await capability('user flow', 'returns an id token', () => {
      if (!userTokens.id_token) throw new Error('absent, so not an OIDC response');
      return '';
    });

    if (doc.userinfo_endpoint) {
      await must('user flow', 'userinfo answers with the access token', async () => {
        const response = await fetch(doc.userinfo_endpoint, {
          headers: { authorization: `Bearer ${userTokens.access_token}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const claims = await response.json();
        return Object.keys(claims).slice(0, 6).join(', ');
      });
    }
  }

  // ── verification ────────────────────────────────────────────────────────────
  // Whichever token is a JWT. Preferring the user's unconditionally skipped these checks
  // for a provider that hands back an opaque one, losing coverage that was there.
  const subject = [userTokens?.access_token, userTokens?.id_token, serviceToken].find(
    (t) => t && claimsOf(t),
  );
  if (subject) {
    const claims = claimsOf(subject);
    record('verify', 'verifying', 'note',
      subject === serviceToken ? 'the service token, the user one being opaque' : 'a user token');
    await must('verify', 'JWKS verification accepts a genuine token', async () => {
      const verify = createTokenVerifier({
        issuer: [cfg.issuer, doc.issuer].filter(Boolean),
        audience: claims.aud ? (Array.isArray(claims.aud) ? claims.aud[0] : claims.aud) : false,
        authorizedParty: claims.aud ? undefined : (claims.azp ?? claims.client_id),
      });
      await verify(subject);
      return '';
    });

    await must('verify', 'a tampered signature is refused', async () => {
      const verify = createTokenVerifier({
        issuer: [cfg.issuer, doc.issuer].filter(Boolean),
        audience: claims.aud ? (Array.isArray(claims.aud) ? claims.aud[0] : claims.aud) : false,
        authorizedParty: claims.aud ? undefined : (claims.azp ?? claims.client_id),
      });
      const [h, p] = subject.split('.');
      await verify(`${h}.${p}.AAAA`).then(
        () => {
          throw new Error('accepted a forged signature');
        },
        () => undefined,
      );
      return '';
    });
  }

  // ── introspection ───────────────────────────────────────────────────────────
  // Introspecting needs credentials to authenticate the *caller*, which is not the same
  // as supporting the client_credentials *grant*. Gating this on `service` skipped every
  // provider that offers one without the other, Dex among them.
  const asker = cfg.introspect ?? cfg.service;

  // The service token where there is one: several providers refuse to introspect a token
  // whose audience does not include the asking client, and a service client is always in
  // its own.
  const introspectable = serviceToken ?? subject;
  if (doc.introspection_endpoint && asker && introspectable) {
    await capability('introspect', 'reports a live token as active', async () => {
      const verify = createTokenIntrospector({
        issuer: cfg.issuer,
        clientId: asker.clientId,
        clientSecret: asker.clientSecret,
        audience: false,
      });
      const claims = await verify(introspectable);
      return Object.keys(claims).slice(0, 5).join(', ');
    });
  }

  // ── revocation ──────────────────────────────────────────────────────────────
  if (doc.revocation_endpoint && userTokens?.refresh_token) {
    await capability('revoke', 'a revoked refresh token stops working', async () => {
      const refresh = async () => {
        const response = await fetch(doc.token_endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: userTokens.refresh_token,
            client_id: tokenClient.clientId,
            ...(tokenClient.clientSecret ? { client_secret: tokenClient.clientSecret } : {}),
          }),
        });
        return { ok: response.ok, why: response.ok ? '' : await response.text() };
      };

      const first = await refresh();
      if (!first.ok) {
        // Saying only that it failed sends the reader to the provider's logs for
        // something the provider already explained.
        throw new Error(`the refresh token did not work to begin with: ${first.why}`);
      }

      await fetch(doc.revocation_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: userTokens.refresh_token,
          token_type_hint: 'refresh_token',
          client_id: tokenClient.clientId,
          ...(tokenClient.clientSecret ? { client_secret: tokenClient.clientSecret } : {}),
        }),
      });

      const second = await refresh();
      if (second.ok) throw new Error('still worked after revocation');
      return '';
    });
  }

  // Last, deliberately. Keycloak revokes the whole session when a code is replayed,
  // which RFC 6749 recommends and which destroys anything this suite still needed.
  if (spentCode) {
    await must('user flow', 'a replayed authorization code is refused', async () => {
      const response = await fetch(doc.token_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: spentCode.code,
          redirect_uri: spentCode.redirectUri,
          client_id: cfg.client.clientId,
          ...(cfg.client.clientSecret ? { client_secret: cfg.client.clientSecret } : {}),
        }),
      });
      if (response.ok) throw new Error('the provider accepted a code it had already spent');
      return `refused with ${response.status}`;
    });
  }

  report(name);
  return results.some((r) => r.status === 'fail');
}

function report(provider) {
  const mark = { pass: 'PASS', fail: 'FAIL', yes: ' YES', no: '  no', note: 'note' };
  let area = '';
  for (const r of results) {
    if (r.area !== area) {
      area = r.area;
      console.log(`\n  ${area}`);
    }
    console.log(`    ${mark[r.status]}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
  }

  const failed = results.filter((r) => r.status === 'fail');
  console.log(
    `\n  ${provider}: ${results.filter((r) => r.status === 'pass').length} passed, ` +
      `${failed.length} failed, ${results.filter((r) => r.status === 'no').length} not supported`,
  );
}

// ─── entry ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dir = join(HERE, 'providers');
const available = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('.example.'))
  .map((f) => f.replace(/\.json$/, ''));

const wanted = args.includes('--all') ? available : args.filter((a) => !a.startsWith('--'));
if (!wanted.length) {
  console.log(`usage: node conformance/run.mjs <provider|--all>\n\navailable: ${available.join(', ')}`);
  console.log('\nconfigs ending .example.json need credentials before they can run.');
  process.exit(0);
}

let anyFailed = false;
for (const name of wanted) {
  let cfg;
  try {
    cfg = resolveSecrets(JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8')));
  } catch (error) {
    console.log(`\n  ${name}: ${error.message}`);
    anyFailed = true;
    continue;
  }
  anyFailed = (await runProvider(name, cfg)) || anyFailed;
}
process.exit(anyFailed ? 1 : 0);
