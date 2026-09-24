/**
 * The debugger: pick a provider, sign in, and see what came back.
 *
 * The buttons offered depend on the provider's discovery document rather than a fixed
 * list, so one that publishes no revocation endpoint shows no revocation button.
 */
import { signal, createEffect } from '@fluixi/reactive/signal';
import { Show, For } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import {
  abbreviate,
  inspect,
  NOTABLE,
  relativeTo,
  type Capabilities,
} from '../lib/inspect.js';
import { needsSetup, PROVIDERS, type ProviderId } from '../lib/providers.js';
import { currentService, select, selection } from '../lib/session.js';

/** One line of what happened, so a failure is readable without the console. */
interface LogLine {
  at: string;
  what: string;
  detail: string;
  ok: boolean;
}

export default function Debugger() {
  seo({ title: 'Auth flow debugger', robots: 'noindex' });

  const log = signal<LogLine[]>([]);
  const capabilities = signal<Capabilities | null>(null);
  const capabilityError = signal<string | null>(null);
  /** Re-read every second so an expiry reads as a countdown rather than a timestamp. */
  const now = signal(Date.now());

  const note = (what: string, detail: string, ok = true) =>
    log.set([
      { at: new Date().toLocaleTimeString(), what, detail, ok },
      ...log().slice(0, 29),
    ]);

  if (typeof window !== 'undefined') {
    setInterval(() => now.set(Date.now()), 1000);

    // The document says what a provider can do, so the interface can offer only that.
    createEffect(() => {
      const provider = PROVIDERS[selection().provider];
      capabilities.set(null);
      capabilityError.set(null);
      if (needsSetup(provider)) return;

      // Through this app's own route: a provider that refuses a cross-origin read of its
      // discovery document would block the page from asking directly.
      void fetch(`/api/capabilities?provider=${provider.id}`)
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
          capabilities.set(body as Capabilities);
        })
        .catch((cause) =>
          capabilityError.set(cause instanceof Error ? cause.message : String(cause)),
        );
    });
  }

  const provider = () => PROVIDERS[selection().provider];
  const service = () => currentService();

  const act = async (what: string, run: () => Promise<unknown>) => {
    try {
      const result = await run();
      note(what, typeof result === 'string' ? result : 'done', true);
    } catch (cause) {
      note(what, cause instanceof Error ? cause.message : String(cause), false);
    }
  };

  return (
    <main class="debugger">
      <h1>Auth flow debugger</h1>
      <p class="lede">
        One app, five providers. What each hands back, and what refresh, introspection,
        revocation and logout actually do.
      </p>

      <section class="picker">
        <h2>Provider</h2>
        <div class="row">
          <For each={() => Object.values(PROVIDERS)}>
            {(p) => (
              <button
                type="button"
                class={() => (selection().provider === p.id ? 'chip on' : 'chip')}
                onClick={() => select({ provider: p.id as ProviderId })}
              >
                {p.label}
                <Show when={() => needsSetup(p)}>
                  <span class="warn" title="Still a placeholder: fill in providers.ts">
                    {' '}needs setup
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>

        <h2>Where the tokens live</h2>
        <div class="row">
          <For each={() => provider().modes}>
            {(m) => (
              <button
                type="button"
                class={() => (selection().mode === m ? 'chip on' : 'chip')}
                onClick={() => select({ mode: m })}
              >
                {m === 'browser' ? 'this browser' : "this app's server"}
              </button>
            )}
          </For>
          <Show when={() => provider().modes.length === 1}>
            <small class="muted">
              {' '}only one mode works with {() => provider().label}
            </small>
          </Show>
        </div>
      </section>

      <section class="notes">
        <h2>What to expect from {() => provider().label}</h2>
        <ul>
          <For each={() => provider().notes}>
            {(n) => <li class={n.kind}>{n.text}</li>}
          </For>
        </ul>
      </section>

      <section class="actions">
        <h2>Flow</h2>
        <Show
          when={() => service().isAuthenticated()}
          fallback={
            <div class="row">
              <button
                type="button"
                class="primary"
                disabled={() => needsSetup(provider())}
                onClick={() => void service().signIn({ returnTo: '/' })}
              >
                Sign in with {() => provider().label}
              </button>
              <Show when={() => needsSetup(provider())}>
                <small class="muted">
                  {' '}fill in this provider's issuer and client id in{' '}
                  <code>src/lib/providers.ts</code>
                </small>
              </Show>
            </div>
          }
        >
          <div class="row">
            <button type="button" onClick={() => void act('refresh', () => service().refresh())}>
              Refresh
            </button>

            <Show when={() => !!capabilities()?.introspection}>
              <button
                type="button"
                onClick={() =>
                  void act('introspect', async () => {
                    // Introspection authenticates the caller, so it belongs on a server.
                    // The browser asks this app's own route to do it.
                    const response = await fetch('/api/introspect', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        provider: selection().provider,
                        token: service().token(),
                      }),
                    });
                    const body = await response.json();
                    return response.ok ? JSON.stringify(body).slice(0, 160) : `refused: ${JSON.stringify(body)}`;
                  })
                }
              >
                Introspect
              </button>
            </Show>

            <Show when={() => !!capabilities()?.revocation}>
              <button
                type="button"
                onClick={() => void act('revoke the refresh token', () => service().client.revoke?.() ?? Promise.resolve())}
              >
                Revoke
              </button>
            </Show>

            <button type="button" class="danger" onClick={() => void service().logout()}>
              Sign out
            </button>
          </div>
        </Show>
      </section>

      <Show when={() => service().isAuthenticated()}>
        <section class="tokens">
          <h2>Tokens</h2>
          {() => {
            const token = service().token();
            const seen = inspect(token);
            if (!token || !seen) return <p class="muted">no access token held</p>;

            return (
              <>
                <table>
                  <tbody>
                    <tr>
                      <th>Format</th>
                      <td>
                        {seen.kind === 'jwt' ? 'JWT' : 'opaque'}
                        {' '}
                        <span class="muted">{seen.length} characters</span>
                      </td>
                    </tr>
                    <tr>
                      <th>Value</th>
                      <td><code class="token" title={token}>{abbreviate(token)}</code></td>
                    </tr>
                    <tr>
                      <th>Expires</th>
                      <td>{() => relativeTo(seen.expiresAt, now())}</td>
                    </tr>
                    <Show when={() => seen.lifetimeSec !== undefined}>
                      <tr>
                        <th>Minted for</th>
                        <td>{seen.lifetimeSec}s</td>
                      </tr>
                    </Show>
                    <Show when={() => !!seen.header}>
                      <tr>
                        <th>Header</th>
                        <td><code>{JSON.stringify(seen.header)}</code></td>
                      </tr>
                    </Show>
                  </tbody>
                </table>

                <Show
                  when={() => seen.kind === 'jwt'}
                  fallback={
                    <p class="muted">
                      An opaque token carries nothing readable. Only the provider can say
                      what it means, through introspection.
                    </p>
                  }
                >
                  <h3>Claims</h3>
                  <table>
                    <tbody>
                      <For each={() => NOTABLE.filter((c) => seen.claims?.[c] !== undefined)}>
                        {(claim) => (
                          <tr>
                            <th>{claim}</th>
                            <td><code>{JSON.stringify(seen.claims![claim])}</code></td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>

                  <details>
                    <summary>Every claim</summary>
                    <pre>{JSON.stringify(seen.claims, null, 2)}</pre>
                  </details>
                </Show>
              </>
            );
          }}
        </section>

        <section class="user">
          <h2>User</h2>
          <pre>{() => JSON.stringify(service().user(), null, 2)}</pre>
        </section>
      </Show>

      <section class="capabilities">
        <h2>What the provider publishes</h2>
        <Show
          when={() => !!capabilities()}
          fallback={
            <p class="muted">
              {() =>
                capabilityError() ??
                (needsSetup(provider())
                  ? 'not fetched: this provider still has placeholder values'
                  : 'reading the discovery document')
              }
            </p>
          }
        >
          {() => {
            const c = capabilities()!;
            const row = (label: string, value: string | undefined) => (
              <tr>
                <th>{label}</th>
                <td>{value ? <code>{value}</code> : <span class="absent">absent</span>}</td>
              </tr>
            );
            return (
              <table>
                <tbody>
                  {row('issuer', c.issuer)}
                  {row('authorization', c.authorization)}
                  {row('token', c.token)}
                  {row('userinfo', c.userinfo)}
                  {row('jwks', c.jwks)}
                  {row('introspection', c.introspection)}
                  {row('revocation', c.revocation)}
                  {row('end session', c.endSession)}
                  <tr><th>PKCE</th><td><code>{c.pkceMethods.join(', ') || 'none advertised'}</code></td></tr>
                  <tr><th>client auth</th><td><code>{c.clientAuthMethods.join(', ') || 'none advertised'}</code></td></tr>
                </tbody>
              </table>
            );
          }}
        </Show>
      </section>

      <section class="log">
        <h2>What happened</h2>
        <Show when={() => log().length > 0} fallback={<p class="muted">nothing yet</p>}>
          <ul>
            <For each={log}>
              {(line) => (
                <li class={line.ok ? 'ok' : 'bad'}>
                  <span class="muted">{line.at}</span> <strong>{line.what}</strong>{' '}
                  <span>{line.detail}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
    </main>
  );
}
