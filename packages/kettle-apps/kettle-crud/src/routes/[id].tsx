import {
  createAsync,
  useRouteData,
  useParams,
  useAction,
  useSubmission,
  A,
} from '@awc/kettlejs/router';
import { getUser, updateUser, type User } from '../api';
import { html, Show } from '@awc/kettlejs';

// Route Data Loader
// Executed by the router before rendering
export const routeData = ({ params }: any) => {
  return createAsync(() => getUser(params?.id));
};

export default function UserDetail() {
  const user = useRouteData<User>();
  const params = useParams();

  const updateAction = useAction(updateUser);
  const submission = useSubmission(updateUser);

  const handleSubmit = async (e: Event) => {
    console.log('sumisiin', submission());
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    // Add ID from params if not in form (or hidden field)
    if (!formData.has('id')) {
      formData.append('id', params.id);
    }

    await updateAction(formData);
    alert('User updated!');
  };

  return html`
    <div class="max-w-md mx-auto p-4">
      ${A({
        href: '/',
        class: 'text-blue-500 hover:underline mb-4 inline-block',
        children: '\u2190 Back to Users',
      })}

      <h1 class="text-2xl font-bold mb-6">Edit User: ${params.id}</h1>

      ${Show({
        when: user,
        fallback: html`<p>Loading user details...</p>`,
        children: (u) => {
          console.log('user child', {
            name: u,
            params,
            user,
            sub: submission()?.pending,
          });
          return html`
            <form
              @submit=${handleSubmit}
              class="space-y-4 border p-6 rounded shadow bg-white"
            >
              <input type="hidden" name="id" value=${u.id} />

              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Name</label
                >
                <input
                  type="text"
                  name="name"
                  value=${u.name}
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Email</label
                >
                <input
                  type="email"
                  name="email"
                  value=${u.email}
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Role</label
                >
                <select
                  name="role"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="Admin" ?selected=${u.role === 'Admin'}>
                    Admin
                  </option>
                  <option value="User" ?selected=${u.role === 'User'}>
                    User
                  </option>
                </select>
              </div>

              <div class="pt-4">
                <button
                  type="submit"
                  ?disabled=${submission()?.pending}
                  class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  ${() =>
                    submission()?.pending ? 'Saving...' : 'Save Changes'}
                </button>

                <p class="text-red-500 mt-2 text-sm">
                  ${() =>
                    submission()?.error ? submission()?.error.message : ''}
                </p>
              </div>
            </form>
          `;
        },
      })}
    </div>
  `;
}
