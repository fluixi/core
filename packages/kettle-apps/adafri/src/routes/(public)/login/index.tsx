import { authClient } from '../../../infrastructure/auth/auth-client.js';

export default function LoginPage() {
  const handleLogin = () => {
    const returnTo = (window.history.state as any)?.returnTo as string | undefined;
    authClient.redirectToLogin(returnTo);
  };

  return (
    <main class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <span aria-hidden="true">⚡</span>
          <h1>Adafri</h1>
        </div>
        <p class="auth-tagline">Manage your advertising campaigns with confidence.</p>
        <button class="btn btn-primary btn-lg auth-cta" type="button" onClick={handleLogin}>
          Sign in with your account
        </button>
        <p class="auth-footer">
          By signing in you agree to our{' '}
          <a href="/terms">Terms of Service</a> and{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
