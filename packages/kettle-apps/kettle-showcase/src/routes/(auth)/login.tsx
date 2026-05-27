// Page de connexion — /login
// Démontre : formulaire contrôlé, signaux locaux, gestion d'erreur, navigation, contexte auth
import { html, createSignal, Show } from '@awc/kettlejs';
import { useNavigate, A } from '@awc/kettlejs/router';
import { useAuth } from '../../store/auth';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Signaux locaux du formulaire
  const [email, setEmail] = createSignal('admin@kettle.dev');
  const [password, setPassword] = createSignal('admin');
  const [error, setError] = createSignal<string | undefined>(undefined);
  const [loading, setLoading] = createSignal(false);

  // Redirige si déjà connecté
  if (isAuthenticated()) {
    navigate('/dashboard', { replace: true });
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email(), password());
    setLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setError('Email ou mot de passe incorrect.');
    }
  };

  return html`
    <div class="auth-page">
      <div class="auth-card card">
        <h2 class="page-title" style="text-align:center">Connexion</h2>
        <p
          class="text-sm text-muted"
          style="text-align:center;margin-bottom:1.5rem"
        >
          Connectez-vous pour accéder au tableau de bord
        </p>

        <!-- Message d'erreur -->
        ${Show({
          when: () => error(),
          children: () => html` <div class="alert alert-error">${error}</div> `,
        })}

        <form @submit=${handleSubmit}>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input
              class="input"
              type="email"
              placeholder="votre@email.com"
              .value=${email()}
              @input=${(e: Event) =>
                setEmail((e.target as HTMLInputElement).value)}
              ?disabled=${loading()}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <input
              class="input"
              type="password"
              placeholder="••••••••"
              .value=${password()}
              @input=${(e: Event) =>
                setPassword((e.target as HTMLInputElement).value)}
              ?disabled=${loading()}
              required
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            style="width:100%;margin-top:.5rem"
            ?disabled=${loading()}
          >
            ${() => (loading() ? 'Connexion en cours…' : 'Se connecter')}
          </button>
        </form>

        <div
          class="text-sm text-muted"
          style="text-align:center;margin-top:1rem"
        >
          Pas encore de compte ?
          ${A({ href: '/register', children: "S'inscrire" })}
        </div>

        <!-- Aide — comptes de test -->
        <div
          class="text-sm text-muted"
          style="margin-top:1.5rem;padding:1rem;background:var(--bg-secondary);border-radius:8px"
        >
          <strong>Comptes de test :</strong><br />
          admin@kettle.dev / admin<br />
          user@kettle.dev / user
        </div>
      </div>
    </div>
  `;
}
