// Page d'inscription — /register
// Démontre : validation multi-champs, signaux locaux, navigation, contexte auth
import { html, createSignal, Show } from '@awc/kettlejs';
import { useNavigate, A } from '@awc/kettlejs/router';
import { useAuth } from '../../store/auth';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Signaux du formulaire
  const [name, setName] = createSignal<string | undefined>('');
  const [email, setEmail] = createSignal<string | undefined>('');
  const [password, setPassword] = createSignal<string | undefined>('');
  const [confirm, setConfirm] = createSignal('');
  const [error, setError] = createSignal<string | undefined>(undefined);
  const [loading, setLoading] = createSignal(false);

  // Redirige si déjà connecté
  if (isAuthenticated()) {
    navigate('/dashboard', { replace: true });
  }

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setError(undefined);
    const n = name();
    const p = password();
    const e = email();

    // Validation côté client
    if (!n || !n.trim()) {
      setError('Le nom est requis.');
      return;
    }
    if (!e || !e.trim()) {
      setError("L'email est requis.");
      return;
    }
    if (!p || p.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }
    if (password() !== confirm()) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const success = await register(n, e, p);
    setLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setError('Un compte existe déjà avec cet email.');
    }
  };

  return html`
    <div class="auth-page">
      <div class="auth-card card">
        <h2 class="page-title" style="text-align:center">Créer un compte</h2>
        <p
          class="text-sm text-muted"
          style="text-align:center;margin-bottom:1.5rem"
        >
          Inscrivez-vous pour commencer
        </p>

        <!-- Message d'erreur -->
        ${Show({
          when: () => error(),
          children: () => html` <div class="alert alert-error">${error}</div> `,
        })}

        <form @submit=${handleSubmit}>
          <div class="form-group">
            <label class="form-label">Nom complet</label>
            <input
              class="input"
              type="text"
              placeholder="Jean Dupont"
              .value=${name()}
              @input=${(e: Event) =>
                setName((e.target as HTMLInputElement).value)}
              ?disabled=${loading()}
              required
            />
          </div>

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

          <div class="form-group">
            <label class="form-label">Confirmer le mot de passe</label>
            <input
              class="input"
              type="password"
              placeholder="••••••••"
              .value=${confirm()}
              @input=${(e: Event) =>
                setConfirm((e.target as HTMLInputElement).value)}
              ?disabled=${loading()}
              required
            />
          </div>

          <!-- Résumé réactif -->
          ${Show({
            when: () => (name() || '').trim().length > 0,
            children: () => html`
              <div class="text-sm text-muted mb-3">
                Bienvenue, <strong>${name}</strong> ! Votre rôle sera :
                <em>utilisateur</em>
              </div>
            `,
          })}

          <button
            type="submit"
            class="btn btn-primary"
            style="width:100%;margin-top:.5rem"
            ?disabled=${loading()}
          >
            ${() => (loading() ? 'Inscription en cours…' : "S'inscrire")}
          </button>
        </form>

        <div
          class="text-sm text-muted"
          style="text-align:center;margin-top:1rem"
        >
          Déjà un compte ? ${A({ href: '/login', children: 'Se connecter' })}
        </div>
      </div>
    </div>
  `;
}
