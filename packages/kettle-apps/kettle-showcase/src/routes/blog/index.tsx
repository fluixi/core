// Liste des articles — /blog
// Démontre : routeData, Show, rendu de liste, navigation dynamique
import { useRouteData } from '@awc/kettlejs/router';
import { html, Show } from '@awc/kettlejs';
import { A } from '@awc/kettlejs/router';
import { getPosts, type BlogPost } from '../../lib/api';

// Chargeur de données — les articles sont mis en cache
export const routeData = () => {
  return getPosts();
};

export default function BlogIndex() {
  const posts = useRouteData<BlogPost[]>();

  return html`
    <div>
      ${Show({
        when: posts,
        fallback: html`
          <div>
            ${[1, 2, 3].map(() => html`
              <div class="card blog-post">
                <div class="skeleton" style="height:24px;width:60%;margin-bottom:.5rem"></div>
                <div class="skeleton" style="height:14px;width:30%;margin-bottom:.75rem"></div>
                <div class="skeleton" style="height:14px;width:90%"></div>
              </div>
            `)}
          </div>
        `,
        children: (list) => html`
          ${list.map(
            (post) => html`
              <article class="card blog-post">
                <h2>
                  ${A({
                    href: `/blog/${post.slug}`,
                    children: post.title,
                  })}
                </h2>
                <div class="meta">
                  Par ${post.author} — ${post.date}
                  ${post.tags.map((t) => html`<span class="badge badge-primary" style="margin-left:.5rem">${t}</span>`)}
                </div>
                <p class="text-sm text-muted">${post.excerpt}</p>
              </article>
            `
          )}
        `,
      })}
    </div>
  `;
}
