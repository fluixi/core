import { seo } from '@fluixi/start/head';
import { html } from '@fluixi/start';

const tick = <T,>(v: T, ms = 30) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// A data-gated route, like a real page: the browser shows the content once the resource
// resolves.
export default function Home() {
  const data = $resource(() => tick('Hello from Fluixi Start 👋'));

  // Per-route document head: written into <head> in the browser and kept reactive. With
  // `ssr: true` it is rendered on the server too, which is what crawlers and link previews read. seo() is optional; call it where you want metadata.
  seo({
    title: 'Fluixi Start',
    description: 'A Fluixi app rendered in the browser, scaffolded by the fluixi CLI.',
  });

  return html`
    <section class="home">
      <h1>${data()}</h1>
      <p>Rendered in the browser, served by the fluixi CLI.</p>
    </section>
  `;
}
