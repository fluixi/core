import { html } from '@fluixi/core';

export function App() {
  const count = $signal(0);
  return html`
    <div class="app">
      <h1>Fluixi</h1>
      <button @click=${() => count.set(count() - 1)}>-</button>
      <span>${count()}</span>
      <button @click=${() => count.set(count() + 1)}>+</button>
    </div>
  `;
}
