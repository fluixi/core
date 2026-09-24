/**
 * Where a browser-mode flow comes back to.
 *
 * Server mode never reaches this: the provider redirects to `/auth/<provider>/callback`,
 * the middleware exchanges the code and sets the cookie, and the browser lands on a page
 * already signed in.
 */
import { signal } from '@fluixi/reactive/signal';
import { useNavigate } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import { currentService, selection } from '../../lib/session.js';

export default function Callback() {
  seo({ title: 'Completing sign in', robots: 'noindex' });

  const navigate = useNavigate();
  const error = signal<string | null>(null);

  // The code is on this URL and the PKCE verifier is in this browser's storage, so the
  // exchange happens here and nowhere else.
  if (typeof window !== 'undefined' && selection().mode === 'browser') {
    void currentService()
      .complete()
      .then((destination) => navigate(destination, { replace: true }))
      .catch((cause) => error.set(cause instanceof Error ? cause.message : String(cause)));
  }

  return (
    <main class="debugger">
      <h1>Completing sign in</h1>
      {() =>
        error() ? (
          <>
            <p class="bad">{error()}</p>
            <p>
              <a href="/">Back to the debugger</a>
            </p>
          </>
        ) : (
          <p class="muted">exchanging the authorization code</p>
        )
      }
    </main>
  );
}
