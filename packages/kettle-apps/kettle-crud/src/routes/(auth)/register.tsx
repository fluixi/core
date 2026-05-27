import { A, useNavigate } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    alert(`Registration: ${name()} (${email()})`);
    navigate('/login');
  };

  return html`
    <div class="max-w-sm mx-auto p-4">
      <h1 class="text-2xl font-bold mb-6">Register</h1>
      <p class="text-sm text-gray-500 mb-4">
        Route group test: this page is at <code>/register</code> (not <code>/(auth)/register</code>)
      </p>
      <form @submit=${handleSubmit} class="space-y-4 bg-white border rounded p-6">
        <div>
          <label class="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value=${name()}
            @input=${(e: any) => setName(e.target.value)}
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value=${email()}
            @input=${(e: any) => setEmail(e.target.value)}
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value=${password()}
            @input=${(e: any) => setPassword(e.target.value)}
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="********"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
        >
          Create Account
        </button>
      </form>
      <p class="mt-4 text-sm text-center text-gray-500">
        Already have an account?
        ${A({
          href: '/login',
          class: 'text-blue-500 hover:underline',
          children: 'Login',
        })}
      </p>
    </div>
  `;
}
