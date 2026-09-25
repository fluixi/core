/**
 * Where a browser-mode flow comes back to.
 *
 * Server mode never reaches this: the provider redirects to `/auth/<provider>/callback`, the
 * middleware exchanges the code and sets the cookie, and the browser lands on a page already
 * signed in.
 *
 * `useOAuthCallback` runs the exchange and reports what the URL carried. The hook rather than
 * `OAuthCallback` because this page shows the parameters and picks between five providers,
 * which is more than a finished component should assume.
 */
import { signal } from '@fluixi/reactive/signal';
import { onMount, Show } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import { useOAuthCallback } from '@fluixi/oauth2/callback';
import { PROVIDERS } from '../../lib/providers.js';
import { readSelection, serviceFor } from '../../lib/session.js';

export default function Callback() {
  seo({ title: 'Completing sign in', robots: 'noindex' });

  // Server-safe initial values, so the first render matches on both sides.
  const providerLabel = signal('reading');
  const mode = signal('reading');
  const wrongMode = signal<string | null>(null);

  const { stage, error, params, destination } = useOAuthCallback({
    // Built from the selection read at mount, not from the reactive one: that signal starts
    // at its default until a page restores it, and a service for the wrong provider looks for
    // a state this flow never stored, which reads as a state mismatch.
    service: () => serviceFor(readSelection()),
    enabled: () => readSelection().mode === 'browser',
  });

  onMount(() => {
    const selection = readSelection();
    const provider = PROVIDERS[selection.provider];
    providerLabel.set(provider.label);
    mode.set(selection.mode);

    if (selection.mode !== 'browser') {
      wrongMode.set(
        `This is the browser-mode callback, but ${provider.label} is selected in server mode. Its callback is /auth/${provider.id}/callback, handled by the middleware.`,
      );
    }
  });

  const shown = () => wrongMode() ?? error();

  return (
    <main class="debugger">
      <h1>Completing sign in</h1>

      <section>
        <h2>Selection</h2>
        <table>
          <tbody>
            <tr><th>Provider</th><td>{providerLabel}</td></tr>
            <tr><th>Mode</th><td>{mode}</td></tr>
            <tr><th>Stage</th><td>{() => (wrongMode() ? 'nothing to do here' : stage())}</td></tr>
            <Show when={destination}>
              <tr><th>Going to</th><td><code>{destination}</code></td></tr>
            </Show>
          </tbody>
        </table>
      </section>

      <section>
        <h2>What the provider sent back</h2>
        <Show
          when={() => Object.keys(params()).length > 0}
          fallback={<p class="muted">nothing on the URL</p>}
        >
          <table>
            <tbody>
              {() =>
                Object.entries(params()).map(([key, value]) => (
                  <tr>
                    <th>{key}</th>
                    <td><code class="token">{value}</code></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Show>
      </section>

      <Show when={shown}>
        <section>
          <h2>Why it stopped</h2>
          <p class="bad">{shown}</p>
          <p class="muted">
            A state mismatch usually means the flow was started for a different provider, or
            this browser's storage was cleared between the redirect and the return.
          </p>
        </section>
      </Show>

      <p><a href="/">Back to the debugger</a></p>
    </main>
  );
}
