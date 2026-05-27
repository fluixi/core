import { useNavigate } from '@awc/kettlejs/router';
import { useEffect, createSignal } from '@awc/kettlejs';
import { authClient } from '../../../../infrastructure/auth/auth-client.js';
import { ROUTES } from '../../../../config/constants.js';
import { Spinner } from '../../../../shared/components/ui/Spinner.js';

export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = createSignal<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');

    if (!code) {
      setError('Missing authorization code. Please try logging in again.');
      return;
    }

    authClient.handleCallback(code)
      .then(() => {
        const state = params.get('state');
        navigate(state ?? ROUTES.dashboard, { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Authentication failed. Please try again.');
      });
  });

  return (
    <main class="auth-page">
      <div class="auth-card">
        {() => {
          const err = error();
          if (err) {
            return (
              <div class="auth-error">
                <p class="auth-error-icon">⚠️</p>
                <p class="auth-error-message">{err}</p>
                <a href={ROUTES.login} class="btn btn-primary">Back to login</a>
              </div>
            );
          }
          return (
            <div class="auth-loading">
              <Spinner size="lg" />
              <p>Completing sign in…</p>
            </div>
          );
        }}
      </div>
    </main>
  );
}
