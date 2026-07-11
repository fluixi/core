import { createSignal } from '@fluixi/core';
import { html } from '@fluixi/lit';

// A fine-grained reactive counter written with lit html`` instead of JSX.
// `html`, `Show`, etc. come from @fluixi/lit; the template is compiled to
// @fluixi/dom runtime calls — no lit runtime ships.
export function Counter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);
  const tone = () => (count() < 0 ? 'neg' : 'pos');
  // history of values — drives a nested-composition list
  const history = () => Array.from({ length: Math.abs(count()) }, (_, i) => i + 1);

  return html`
    <div class="counter">
      <h1>Fluixi · lit-html</h1>
      <button class="dec" @click=${() => setCount(count() - 1)}>-</button>
      <span class="value ${tone()}">${count()}</span>
      <button class="inc" @click=${() => setCount(count() + 1)}>+</button>
      <button class="reset" @click=${() => setCount(props.start ?? 0)}>reset</button>
      <Show when=${count() < 0}>
        <p class="warn">below zero</p>
      </Show>
      <ul class="ticks">
        <For each=${history()}>${(n: number) => html`<li>tick ${n}</li>`}</For>
      </ul>
    </div>
  `;
}
