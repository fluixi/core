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
          <span class="auth-logo-icon">⚡</span>
          <h1 class="auth-logo-title">Adafri Admin</h1>
        </div>
        <p class="auth-tagline">Manage your platform with confidence.</p>
        <button class="btn btn-primary btn-lg auth-cta" type="button" onClick={handleLogin}>
          Sign in with your account
        </button>
        <p class="auth-footer">
          Access is restricted to authorised administrators only.
        </p>
      </div>
    </main>
  );
}
