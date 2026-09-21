import { seo } from '@fluixi/start/head';
import { html } from '@fluixi/start';

const tick = <T,>(v: T, ms = 30) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// A data-gated route, like a real page: the resource is awaited during SSR so the
// content (not the spinner) is server-rendered, then hydrated.
export default function Home() {
  const data = $resource(() => tick('Hello from Fluixi Start 👋'));

  // Per-route document head: rendered into <head> on the server (great for crawlers/links)
  // and kept reactive on the client. seo() is optional; call it where you want metadata.
  seo({
    title: 'Fluixi Start',
    description: 'A server-rendered Fluixi app, scaffolded by the fluixi CLI.',
  });

  return html`
    <section class="home">
      <h1>${data()}</h1>
      <p>Server-rendered through the fluixi CLI, then hydrated.</p>
    </section>
  `;
}
