// Page À propos — page statique sans chargement de données
// Démontre : composant simple, interop JSX dans lit-html
import { html } from '@awc/kettlejs';
import { A } from '@awc/kettlejs/router';

// Composant JSX réutilisable — utilisé DANS un template lit-html (interop)
function FeatureCard(props: { title: string; description: string }) {
  return (
    <div class="card" style="margin-bottom:.75rem">
      <div class="card-header">{props.title}</div>
      <p class="text-sm text-muted">{props.description}</p>
    </div>
  );
}

export default function AboutPage() {
  return html`
    <div>
      <h1 class="page-title">À propos de KettleJS</h1>
      <p class="page-subtitle">
        Framework réactif moderne combinant signaux fins et templates lit-html.
      </p>

      <!-- Interop : composants JSX utilisés dans un template lit-html -->
      ${FeatureCard({
        title: 'Signaux réactifs',
        description: 'Suivi fin des dépendances sans Virtual DOM. Les mises à jour sont chirurgicales.',
      })}
      ${FeatureCard({
        title: 'Routage basé sur les fichiers',
        description: 'Routes dynamiques, layouts imbriqués, groupes, catch-all — tout est convention.',
      })}
      ${FeatureCard({
        title: 'Double syntaxe',
        description: 'Écrivez en JSX ou en lit-html. Mélangez les deux dans la même app.',
      })}
      ${FeatureCard({
        title: 'Suspense & Lazy',
        description: 'Chargement différé natif avec boundaries Suspense et code splitting.',
      })}
      ${FeatureCard({
        title: 'Actions & Formulaires',
        description: 'Mutations typées avec suivi de soumission (pending, error, result).',
      })}

      <div class="mt-3">
        ${A({ href: '/', class: 'btn btn-outline', children: '← Retour à l\'accueil' })}
      </div>
    </div>
  `;
}
