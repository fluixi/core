// Page profil protégée — /profile
// Démontre : garde d'auth, routeData, action/useAction/useSubmission, formulaire avec FormData
import { html, createSignal, Show } from '@awc/kettlejs';
import { useRouteData, useAction, useSubmission } from '@awc/kettlejs/router';
import { useAuthGuard } from '../../lib/guard';
import { useAuth } from '../../store/auth';
import { getProfile, updateProfile, type UserProfile } from '../../lib/api';

// Chargement des données — exécuté avant le rendu
export const routeData = () => {
  // On charge le profil de l'utilisateur connecté (id "1" par défaut)
  return getProfile('1');
};

export default function ProfilePage() {
  // Garde — redirige vers /login si non authentifié
  useAuthGuard();

  const { user } = useAuth();
  const profile = useRouteData<UserProfile>();

  // Action de mise à jour du profil
  const submitUpdate = useAction(updateProfile);
  const submission = useSubmission(updateProfile);

  // Signaux locaux pour l'édition
  const [editing, setEditing] = createSignal(false);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    submitUpdate(new FormData(form));
    setEditing(false);
  };

  return html`
    <div>
      <h2 class="page-title">Mon Profil</h2>
      <p class="page-subtitle">Gérez vos informations personnelles</p>

      <!-- Notification de succès après soumission -->
      ${Show({
        when: () => submission()?.result && !submission()?.pending,
        children: () => html`
          <div class="alert alert-success">Profil mis à jour avec succès !</div>
        `,
      })}

      ${Show({
        when: profile,
        fallback: html`
          <div class="card">
            <div class="skeleton" style="height:24px;width:50%;margin-bottom:1rem"></div>
            <div class="skeleton" style="height:14px;width:80%;margin-bottom:.5rem"></div>
            <div class="skeleton" style="height:14px;width:60%"></div>
          </div>
        `,
        children: (p) => html`
          <div class="card">
            <!-- En-tête du profil avec avatar -->
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
              <div class="avatar avatar-lg">
                ${() => user()?.avatar ?? 'U'}
              </div>
              <div>
                <h3 style="margin:0">${p.name}</h3>
                <span class="text-sm text-muted">${p.email}</span>
                <span class="badge badge-primary" style="margin-left:.5rem">${p.role}</span>
              </div>
            </div>

            ${Show({
              when: () => !editing(),
              // Mode lecture
              children: () => html`
                <div class="form-group">
                  <label class="form-label">Bio</label>
                  <p>${p.bio}</p>
                </div>
                <button
                  class="btn btn-primary"
                  @click=${() => setEditing(true)}
                >
                  Modifier le profil
                </button>
              `,
              // Mode édition — formulaire avec FormData
              fallback: html`
                <form @submit=${handleSubmit}>
                  <input type="hidden" name="id" value="${p.id}" />

                  <div class="form-group">
                    <label class="form-label">Nom</label>
                    <input class="input" name="name" type="text" value="${p.name}" required />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input class="input" name="email" type="email" value="${p.email}" required />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Bio</label>
                    <textarea class="input" name="bio" rows="3">${p.bio}</textarea>
                  </div>

                  <div style="display:flex;gap:.5rem">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      ?disabled=${submission()?.pending}
                    >
                      ${() => submission()?.pending ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      class="btn"
                      @click=${() => setEditing(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              `,
            })}
          </div>
        `,
      })}
    </div>
  `;
}
