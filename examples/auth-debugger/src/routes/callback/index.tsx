/**
 * Where a browser-mode flow comes back to.
 *
 * Server mode never reaches this: the provider redirects to `/auth/<provider>/callback`,
 * the middleware exchanges the code and sets the cookie, and the browser lands on a page
 * already signed in.
 *
 * Everything the callback carried is reported, whether the exchange worked or not. A
 * callback that silently does nothing is the least debuggable thing this app could do.
 */
import { signal } from '@fluixi/reactive/signal';
import { useNavigate } from '@fluixi/core';
import { Show } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import { PROVIDERS } from '../../lib/providers.js';
import { currentService, selection } from '../../lib/session.js';

/** What the provider put on the URL, read before anything can consume it. */
function paramsOf(): Record<string, string> {
  if (typeof location === 'undefined') return {};
  return Object.fromEntries(new URL(location.href).searchParams.entries());
}

export default function Callback() {
  seo({ title: 'Completing sign in', robots: 'noindex' });

  const navigate = useNavigate();
  const error = signal<string | null>(null);
  const stage = signal('reading the callback URL');
  const params = signal<Record<string, string>>(paramsOf());

  if (typeof window !== 'undefined') {
    const sel = selection();
    const provider = PROVIDERS[sel.provider];
    const seen = params();

    if (sel.mode !== 'browser') {
      error.set(
        `This is the browser-mode callback, but ${provider.label} is selected in server mode. Its callback is /auth/${provider.id}/callback, handled by the middleware.`,
      );
    } else if (seen.error) {
      // The provider refused before any code existed. Its own words are the whole story.
      error.set(`${seen.error}: ${seen.error_description ?? 'no description given'}`);
    } else if (!seen.code) {
      error.set('No authorization code on this URL, and no error either.');
    } else {
      stage.set(`exchanging the code with ${provider.label}`);
      void currentService()
        .complete()
        .then((destination) => {
          stage.set(`signed in, going to ${destination}`);
          navigate(destination, { replace: true });
        })
        .catch((cause) => {
          error.set(cause instanceof Error ? cause.message : String(cause));
          stage.set('the exchange failed');
        });
    }
  }

  return (
    <main class="debugger">
      <h1>Completing sign in</h1>

      <section>
        <h2>Selection</h2>
        <table>
          <tbody>
            <tr><th>Provider</th><td>{() => PROVIDERS[selection().provider].label}</td></tr>
            <tr><th>Mode</th><td>{() => selection().mode}</td></tr>
            <tr><th>Stage</th><td>{stage}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>What the provider sent back</h2>
        <Show
          when={() => Object.keys(params()).length > 0}
          fallback={<p class="muted">nothing on the URL at all</p>}
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

      <Show when={error}>
        <section>
          <h2>Why it stopped</h2>
          <p class="bad">{error}</p>
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
