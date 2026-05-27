// Page article dynamique — /blog/:slug
// Démontre : route dynamique avec paramètre, routeData avec params, Show
import { useRouteData, useParams, A } from '@awc/kettlejs/router';
import { html, Show } from '@awc/kettlejs';
import { getPost, type BlogPost } from '../../lib/api';

// Le chargeur reçoit les params de la route
export const routeData = ({ params }: any) => {
  return getPost(params?.slug);
};

export default function BlogPostPage() {
  const post = useRouteData<BlogPost>();
  const params = useParams();

  return html`
    <div>
      ${Show({
        when: post,
        fallback: html`
          <div class="card">
            <div class="skeleton" style="height:32px;width:70%;margin-bottom:1rem"></div>
            <div class="skeleton" style="height:14px;width:40%;margin-bottom:1.5rem"></div>
            <div class="skeleton" style="height:200px;width:100%"></div>
          </div>
        `,
        children: (p) => html`
          <article>
            <div class="mb-3">
              ${A({ href: '/blog', class: 'text-sm', children: '← Retour au blog' })}
            </div>
            <h1 class="page-title">${p.title}</h1>
            <div class="text-sm text-muted mb-4">
              Par ${p.author} — ${p.date}
              ${p.tags.map((t) => html`<span class="badge badge-primary" style="margin-left:.5rem">${t}</span>`)}
            </div>
            <div class="card">
              <!-- Le contenu est rendu tel quel (pas de markdown parser ici) -->
              <pre style="white-space:pre-wrap;font-family:inherit;font-size:.9rem;line-height:1.7">${p.content}</pre>
            </div>
          </article>
        `,
      })}
    </div>
  `;
}
