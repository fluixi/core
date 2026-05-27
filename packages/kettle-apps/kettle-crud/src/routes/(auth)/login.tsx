import { A, useNavigate } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    // Simulate login
    alert(`Login attempt: ${email()}`);
    navigate('/');
  };

  return html`
    <div class="max-w-sm mx-auto p-4">
      <h1 class="text-2xl font-bold mb-6">Login</h1>
      <p class="text-sm text-gray-500 mb-4">
        Route group test: this page is at <code>/login</code> (not <code>/(auth)/login</code>)
      </p>
      <form @submit=${handleSubmit} class="space-y-4 bg-white border rounded p-6">
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
          class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Sign In
        </button>
      </form>
      <p class="mt-4 text-sm text-center text-gray-500">
        Don't have an account?
        ${A({
          href: '/register',
          class: 'text-blue-500 hover:underline',
          children: 'Register',
        })}
      </p>
    </div>
  `;
}
