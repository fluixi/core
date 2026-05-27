import { createSignal, createEffect } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { authClient } from '../../../../infrastructure/auth/auth-client.js';
import { ROUTES } from '../../../../config/constants.js';
import { PageSpinner } from '../../../../shared/components/ui/Spinner.js';

export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');
    const err    = params.get('error');

    if (err) {
      setError(params.get('error_description') ?? `OAuth error: ${err}`);
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    authClient
      .handleCallback(code)
      .then(() => {
        navigate(ROUTES.selectAccount, { replace: true });
      })
      .catch((e: Error) => setError(e.message));
  });

  return (
    <main class="auth-page">
      {() => error()
        ? (
          <div class="auth-card auth-error">
            <h2>Authentication failed</h2>
            <p class="error-message">{error()}</p>
            <a href={ROUTES.login} class="btn btn-secondary">Back to login</a>
          </div>
        )
        : (
          <div class="auth-card auth-loading">
            <PageSpinner />
            <p>Completing sign-in…</p>
          </div>
        )
      }
    </main>
  );
}
