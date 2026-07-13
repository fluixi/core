import { html } from '@fluixi/start';

export default function About() {
  return html`
    <section class="about">
      <h1>About</h1>
      <p>A second file-route — proves URL-based SSR matching works.</p>
    </section>
  `;
}
