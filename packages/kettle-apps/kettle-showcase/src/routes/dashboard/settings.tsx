// Page paramètres — /dashboard/settings
// Démontre : formulaire contrôlé, signaux locaux, validation, soumission
import { html, createSignal, Show } from '@awc/kettlejs';

export default function SettingsPage() {
  // État local du formulaire via signaux
  const [siteName, setSiteName] = createSignal('Mon Application');
  const [language, setLanguage] = createSignal('fr');
  const [notifications, setNotifications] = createSignal(true);
  const [saved, setSaved] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>(undefined);

  const handleSave = (e: Event) => {
    e.preventDefault();
    setError('');

    // Validation simple
    if (!siteName().trim()) {
      setError('Le nom du site est requis.');
      return;
    }

    // Simule la sauvegarde
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return html`
    <div>
      <h2 class="page-title">Paramètres</h2>
      <p class="page-subtitle">Configuration générale de l'application</p>

      <!-- Message de succès -->
      ${Show({
        when: () => saved(),
        children: () => html`
          <div class="alert alert-success">
            Paramètres sauvegardés avec succès !
          </div>
        `,
      })}

      <!-- Message d'erreur -->
      ${Show({
        when: () => error(),
        children: () => html` <div class="alert alert-error">${error}</div> `,
      })}

      <form @submit=${handleSave}>
        <div class="card">
          <div class="card-header">Général</div>

          <div class="form-group">
            <label class="form-label">Nom du site</label>
            <input
              class="input"
              type="text"
              .value=${siteName()}
              @input=${(e: Event) =>
                setSiteName((e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Langue</label>
            <select
              class="select"
              .value=${language()}
              @change=${(e: Event) =>
                setLanguage((e.target as HTMLSelectElement).value)}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div class="form-group">
            <label
              class="form-label"
              style="display:flex;align-items:center;gap:.5rem"
            >
              <input
                type="checkbox"
                ?checked=${notifications()}
                @change=${(e: Event) =>
                  setNotifications((e.target as HTMLInputElement).checked)}
              />
              Activer les notifications
            </label>
          </div>

          <!-- Résumé réactif — se met à jour en temps réel -->
          <div class="text-sm text-muted mb-3">
            Configuration : <strong>${siteName}</strong> — ${language} —
            Notifications :
            ${() => (notifications() ? 'Activées' : 'Désactivées')}
          </div>

          <button type="submit" class="btn btn-primary">Sauvegarder</button>
        </div>
      </form>
    </div>
  `;
}
