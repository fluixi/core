import { createSignal, html } from '@fluixi/core';

export function App() {
  const [count, setCount] = createSignal(0);
  return html`
    <div class="app">
      <h1>Fluixi</h1>
      <button @click=${() => setCount(count() - 1)}>-</button>
      <span>${count()}</span>
      <button @click=${() => setCount(count() + 1)}>+</button>
    </div>
  `;
}
