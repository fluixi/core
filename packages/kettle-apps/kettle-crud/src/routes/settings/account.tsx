// import { A } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';

export default function SettingsAccount() {
  const handleDeleteAccount = () => {
    alert('Account deletion is disabled in demo mode.');
  };

  return html`
    <div>
      <h2 class="text-lg font-semibold mb-3">Account Settings</h2>
      <p class="text-sm text-gray-500 mb-4">
        Nested route test: this is <code>/settings/account</code>.
      </p>

      <div class="space-y-4">
        <div class="border rounded p-3">
          <h3 class="font-medium text-sm">Email</h3>
          <p class="text-gray-600">alice@example.com</p>
        </div>

        <div class="border rounded p-3">
          <h3 class="font-medium text-sm">Password</h3>
          <p class="text-gray-600">Last changed 30 days ago</p>
          <button class="mt-2 text-sm text-blue-600 hover:underline">
            Change Password
          </button>
        </div>

        <div class="border border-red-200 rounded p-3 bg-red-50">
          <h3 class="font-medium text-sm text-red-700">Danger Zone</h3>
          <p class="text-sm text-red-600 mb-2">
            Permanently delete your account and all data.
          </p>
          <button
            @click=${handleDeleteAccount}
            class="bg-red-600 text-white text-sm py-1 px-3 rounded hover:bg-red-700"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  `;
}
