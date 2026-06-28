import { createResource } from '@fluixi/reactive/signal';
import { seo } from '@fluixi/start/head';

const tick = <T,>(v: T, ms = 30) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// A data-gated route, like a real page: the resource is awaited during SSR so the
// content (not the spinner) is server-rendered, then hydrated.
export default function Home() {
  const [data] = createResource(() => tick('Hello from Fluixi Start 👋'));

  // Per-route document head — rendered into <head> on the server (great for crawlers/links)
  // and kept reactive on the client. The head engine is always on; seo() is optional, call it
  // only where you want page metadata. Drop in og/twitter/canonical/jsonLd as your app grows.
  seo({
    title: 'Fluixi Start',
    description: 'A server-rendered Fluixi app, scaffolded by the fluixi CLI.',
  });

  return (
    <section class="home">
      <h1>{data()}</h1>
      <p>Server-rendered through the fluixi CLI, then hydrated.</p>
    </section>
  );
}
