/**
 * Where a browser-mode flow comes back to.
 *
 * Server mode never reaches this: the provider redirects to `/auth/<provider>/callback`,
 * the middleware exchanges the code and sets the cookie, and the browser lands on a page
 * already signed in.
 *
 * Everything the callback carried is reported, whether the exchange worked or not.
 *
 * There is no router hook here on purpose: `useNavigate` resolves the router while
 * rendering, and a route that throws there fails to hydrate, leaving the server's markup
 * in place and the page responding to nothing. A callback needs one navigation, and
 * `location.replace` does it without a hook.
 *
 * All of it is read in `onMount` rather than in the component body. `location` and the
 * stored selection exist only in a browser, so reading them while rendering makes the
 * server produce different markup from the client, hydration finds a mismatch, and the
 * page keeps the server's version: the selected provider stays whatever the default was
 * and the parameters read as absent.
 */
import { signal } from '@fluixi/reactive/signal';
import { onMount, Show } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import { PROVIDERS } from '../../lib/providers.js';
import { readSelection, serviceFor } from '../../lib/session.js';

export default function Callback() {
  seo({ title: 'Completing sign in', robots: 'noindex' });

  // Server-safe initial values, so the first render matches on both sides.
  const providerLabel = signal('reading');
  const mode = signal('reading');
  const stage = signal('waiting for the browser');
  const params = signal<Array<[string, string]>>([]);
  const error = signal<string | null>(null);

  onMount(() => {
    const selection = readSelection();
    const provider = PROVIDERS[selection.provider];
    providerLabel.set(provider.label);
    mode.set(selection.mode);

    const seen = Object.fromEntries(new URL(location.href).searchParams.entries());
    params.set(Object.entries(seen));

    if (selection.mode !== 'browser') {
      error.set(
        `This is the browser-mode callback, but ${provider.label} is selected in server mode. Its callback is /auth/${provider.id}/callback, handled by the middleware.`,
      );
      stage.set('nothing to do here');
      return;
    }

    if (seen.error) {
      // The provider refused before any code existed. Its own words are the whole story.
      error.set(`${seen.error}: ${seen.error_description ?? 'no description given'}`);
      stage.set('the provider refused');
      return;
    }

    if (!seen.code) {
      error.set('No authorization code on this URL, and no error either.');
      stage.set('nothing to exchange');
      return;
    }

    stage.set(`exchanging the code with ${provider.label}`);
    // Built from the selection just read, not from the reactive one: that signal starts at
    // its default until a page restores it, and a service for the wrong provider looks for
    // a state this flow never stored, which reads as a state mismatch.
    void serviceFor(selection)
      .complete()
      .then((destination) => {
        stage.set(`signed in, going to ${destination}`);
        // A document navigation rather than a client one. This page exists for a single
        // transition and a fresh load is the simplest way to arrive with the session
        // already established, with no router hook to resolve.
        location.replace(destination);
      })
      .catch((cause) => {
        error.set(cause instanceof Error ? cause.message : String(cause));
        stage.set('the exchange failed');
      });
  });

  return (
    <main class="debugger">
      <h1>Completing sign in</h1>

      <section>
        <h2>Selection</h2>
        <table>
          <tbody>
            <tr><th>Provider</th><td>{providerLabel}</td></tr>
            <tr><th>Mode</th><td>{mode}</td></tr>
            <tr><th>Stage</th><td>{stage}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>What the provider sent back</h2>
        <Show
          when={() => params().length > 0}
          fallback={<p class="muted">nothing on the URL</p>}
        >
          <table>
            <tbody>
              {() =>
                params().map(([key, value]) => (
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
