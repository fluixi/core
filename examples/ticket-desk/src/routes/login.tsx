// Signing in writes the demo token the client interceptor attaches to every outbound
// call. There is no real credential check; the point is the plumbing downstream of it.
import { seo } from '@fluixi/start/head';
import { signal } from '@fluixi/reactive/signal';
import { signIn, signOut, currentToken } from '../services/session.js';

export default function Login() {
  seo({ title: 'Sign in' });

  const token = signal(typeof localStorage === 'undefined' ? null : currentToken());

  const as = (name: string, roles: string[]) => () => {
    signIn(name, roles);
    token.set(currentToken());
  };

  return (
    <section>
      <h1>Sign in</h1>
      <p>
        Pick an identity. The token is stored in <code>localStorage</code> and attached to
        every request by the interceptor registered in <code>entry-client.tsx</code>.
      </p>
      <p>
        <button onClick={as('rita', ['agent', 'admin'])}>rita (agent, admin)</button>{' '}
        <button onClick={as('sam', ['agent'])}>sam (agent)</button>{' '}
        <button onClick={as('wei', [])}>wei (no roles)</button>{' '}
        <button
          onClick={() => {
            signOut();
            token.set(null);
          }}
        >
          sign out
        </button>
      </p>
      <p>
        current token: <code>{() => token() ?? 'none'}</code>
      </p>
    </section>
  );
}
