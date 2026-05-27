import { A } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';

export default function About() {
  return html`
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">About</h1>
      <p class="text-gray-600 mb-4">
        This is a demo app for the KettleJS routing system.
      </p>
      <div class="bg-white border rounded p-4 space-y-2">
        <h2 class="font-semibold">Routing Features Tested:</h2>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Root-level layout (layout.tsx with Outlet)</li>
          <li>Index routes (routes/index.tsx &rarr; /)</li>
          <li>Static routes (about.tsx &rarr; /about)</li>
          <li>Dynamic params ([id].tsx &rarr; /:id)</li>
          <li>Route groups ((auth)/login.tsx &rarr; /login)</li>
          <li>Nested layouts (settings/layout.tsx with Outlet)</li>
          <li>Nested index (settings/index.tsx &rarr; /settings)</li>
          <li>Nested routes (settings/profile.tsx &rarr; /settings/profile)</li>
          <li>Catch-all ([...rest].tsx &rarr; 404)</li>
          <li>Config-based routing (Routes + Route components)</li>
        </ul>
      </div>
      <div class="mt-4">
        ${A({
          href: '/',
          class: 'text-blue-500 hover:underline',
          children: '\u2190 Back to Home',
        })}
      </div>
    </div>
  `;
}
