import { html } from '@awc/kettlejs';

export default function SettingsOverview() {
  return html`
    <div>
      <h2 class="text-lg font-semibold mb-3">Settings Overview</h2>
      <p class="text-gray-600 mb-2">
        Nested index route test: this is <code>/settings</code> (index).
      </p>
      <div class="bg-gray-50 rounded p-3 text-sm text-gray-500">
        <p>Select a settings category from the sidebar.</p>
      </div>
    </div>
  `;
}
