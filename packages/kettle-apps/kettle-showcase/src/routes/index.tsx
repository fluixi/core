// Page d'accueil — affiche les statistiques et un aperçu rapide
// Démontre : routeData, createAsync, Show, état local avec signaux
import { useRouteData } from '@awc/kettlejs/router';
import { html, Show, createSignal } from '@awc/kettlejs';
import { getDashboardStats, type DashboardStats } from '../lib/api';
import { useAuth } from '../store/auth';

// Chargeur de données de route — exécuté avant le rendu
export const routeData = () => {
  return getDashboardStats();
};

export default function HomePage() {
  const stats = useRouteData<DashboardStats>();
  const { isAuthenticated, user } = useAuth();
  
  const [showWelcome, setShowWelcome] = createSignal(true);

  return html`
    <div>
      <!-- Message de bienvenue avec état local -->
      ${Show({
        when: () => showWelcome(),
        children: () => html`
          <div class="alert alert-info flex justify-between items-center">
            <span>
              Bienvenue ${() => isAuthenticated() ? user()!.name : 'visiteur'} !
              Ceci est la démo complète de KettleJS.
            </span>
            <button class="btn btn-ghost btn-sm" @click=${() => setShowWelcome(false)}>
              Fermer
            </button>
          </div>
        `,
      })}

      <h1 class="page-title">Tableau de bord</h1>
      <p class="page-subtitle">Vue d'ensemble de l'application</p>

      <!-- Grille de statistiques avec chargement asynchrone -->
      ${Show({
        when: stats,
        fallback: html`
          <div class="stat-grid">
            ${[1, 2, 3, 4].map(() => html`
              <div class="card stat-card">
                <div class="skeleton" style="height:48px;width:80px;margin:0 auto .5rem"></div>
                <div class="skeleton" style="height:14px;width:100px;margin:0 auto"></div>
              </div>
            `)}
          </div>
        `,
        children: (s) => html`
          <div class="stat-grid">
            <div class="card stat-card">
              <div class="stat-value">${s.users.toLocaleString()}</div>
              <div class="stat-label">Utilisateurs</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value">${s.revenue.toLocaleString()}€</div>
              <div class="stat-label">Revenus</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value">${s.orders}</div>
              <div class="stat-label">Commandes</div>
            </div>
            <div class="card stat-card">
              <div class="stat-value">${s.conversion}%</div>
              <div class="stat-label">Conversion</div>
            </div>
          </div>
        `,
      })}

      <!-- Liens rapides — navigation interne -->
      <div class="card">
        <div class="card-header">Liens rapides</div>
        <div class="flex gap-2">
          <a href="/blog" class="btn btn-outline">Blog</a>
          <a href="/dashboard" class="btn btn-outline">Dashboard détaillé</a>
          <a href="/dashboard/analytics" class="btn btn-outline">Analytiques</a>
          ${() => !isAuthenticated()
            ? html`<a href="/login" class="btn btn-primary">Se connecter</a>`
            : html`<a href="/profile" class="btn btn-primary">Mon profil</a>`}
        </div>
      </div>
    </div>
  `;
}
