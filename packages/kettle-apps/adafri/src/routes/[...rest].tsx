import { A, useParams } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';

export default function NotFound() {
  const params = useParams();
  // console.log('running 404', params);

  return html`
    <div class="p-4 text-center">
      <h1 class="text-4xl font-bold text-gray-300 mb-2">404</h1>
      <h2 class="text-xl font-semibold mb-4">Page Not Found</h2>
      <p class="text-gray-500 mb-2">
        Catch-all route test: <code>/${() => params.rest || ''}</code> does not exist.
      </p>
      <p class="text-sm text-gray-400 mb-6">
        This route matches any path not handled by other routes.
      </p>
      ${A({
        href: '/',
        class: 'inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700',
        children: 'Go Home',
      })}
    </div>
  `;
}
