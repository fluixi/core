import { createSignal } from '@fluixi/core';
import { html } from './html';

// A fine-grained reactive counter written with lit html`` instead of JSX.
// Same signals, same @fluixi/dom runtime — the template is compiled, not
// interpreted by a lit-html runtime. `<Show>` is auto-imported by the compiler.
export function Counter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);
  const tone = () => (count() < 0 ? 'neg' : 'pos');

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
    </div>
  `;
}
