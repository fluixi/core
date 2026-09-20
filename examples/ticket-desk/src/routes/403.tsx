// Where protectedRoute sends a signed-in user who lacks the role.
import { seo } from '@fluixi/start/head';

export default function Forbidden() {
  seo({ title: 'Not allowed', robots: 'noindex' });
  return (
    <section>
      <h1>Not allowed</h1>
      <p>
        Your account is signed in but does not carry the role this page needs. Pick a
        different identity on the <a href="/login">sign-in page</a>.
      </p>
    </section>
  );
}
