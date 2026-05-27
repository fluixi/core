// Page 404 — catch-all pour les routes inconnues
// Démontre : route catch-all [...rest], paramètre rest, navigation
import { html } from '@awc/kettlejs';
import { useParams, A } from '@awc/kettlejs/router';

export default function NotFoundPage() {
  const params = useParams();

  return html`
    <div class="auth-page">
      <div class="card" style="text-align:center;max-width:500px">
        <div style="font-size:4rem;margin-bottom:1rem">🔍</div>
        <h1 class="page-title">Page introuvable</h1>
        <p class="text-muted" style="margin-bottom:1.5rem">
          La page <code>/${() => params.rest ?? ''}</code> n'existe pas.
        </p>
        <div style="display:flex;gap:.5rem;justify-content:center">
          ${A({ href: '/', class: 'btn btn-primary', children: "Retour à l'accueil" })}
          ${A({ href: '/dashboard', class: 'btn', children: 'Tableau de bord' })}
        </div>
      </div>
    </div>
  `;
}
