import { html } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

export default function SettingsProfile() {
  const [name, setName] = createSignal('Alice');
  const [bio, setBio] = createSignal('KettleJS developer');

  const handleSave = (e: Event) => {
    e.preventDefault();
    alert(`Profile saved: ${name()}, ${bio()}`);
  };

  return html`
    <div>
      <h2 class="text-lg font-semibold mb-3">Profile Settings</h2>
      <p class="text-sm text-gray-500 mb-4">
        Nested route test: this is <code>/settings/profile</code>.
      </p>
      <form @submit=${handleSave} class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700">Display Name</label>
          <input
            type="text"
            value=${name()}
            @input=${(e: any) => setName(e.target.value)}
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            @input=${(e: any) => setBio(e.target.value)}
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            rows="3"
          >${bio()}</textarea>
        </div>
        <button
          type="submit"
          class="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Save Profile
        </button>
      </form>
    </div>
  `;
}
