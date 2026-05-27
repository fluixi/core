// Layout blog — enveloppe les routes /blog/*
// Démontre : layout imbriqué avec Outlet
import { Outlet } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';

export default function BlogLayout() {
  return html`
    <div class="blog-layout">
      <div class="flex items-center justify-between mb-4">
        <h1 class="page-title" style="margin-bottom:0">Blog</h1>
        <span class="badge badge-primary">KettleJS</span>
      </div>
      <hr style="border:none;border-top:1px solid var(--color-border);margin-bottom:1.5rem" />
      ${Outlet()}
    </div>
  `;
}
