// Compteur réactif — web component avec props, events et lifecycle
// Démontre : defineElement, props typées, events custom, lifecycle hooks, signaux internes
import { defineElement, wrapElement, createSignal, html } from '@awc/kettlejs';

/**
 * @element k-counter
 * @attr {string} label - Libellé affiché à côté du compteur
 * @attr {number} step - Incrément par clic (défaut : 1)
 * @fires countChange - Émis à chaque changement de valeur
 */
export const KCounter = defineElement(
  'k-counter',
  (props, { emit }) => {
    const [label] = props.label;
    const [step] = props.step;
    const [count, setCount] = createSignal(0);

    const increment = () => {
      setCount((c) => c + step());
      emit('countChange', count());
    };

    const decrement = () => {
      setCount((c) => c - step());
      emit('countChange', count());
    };

    const reset = () => {
      setCount(0);
      emit('countChange', 0);
    };

    return html`
      <div class="counter">
        <span class="counter-label">${label}</span>
        <div class="counter-controls">
          <button @click=${decrement} class="counter-btn">−</button>
          <span class="counter-value">${count}</span>
          <button @click=${increment} class="counter-btn">+</button>
        </div>
        <button @click=${reset} class="counter-reset">Réinitialiser</button>
      </div>
    `;
  },
  {
    props: {
      label: { type: String, default: 'Compteur' },
      step: { type: Number, default: 1 },
    },
    events: {
      countChange: { detail: 0 as number },
    },
    lifecycle: {
      connectedCallback(host) {
        console.log('[k-counter] connecté au DOM', host.tagName);
      },
      disconnectedCallback(host) {
        console.log('[k-counter] retiré du DOM', host.tagName);
      },
    },
    shadow: 'none',
    styles: `
      .counter { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
      .counter-label { font-weight: 600; min-width: 80px; }
      .counter-controls { display: flex; align-items: center; gap: .25rem; }
      .counter-btn {
        width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--border, #ddd);
        background: var(--bg-secondary, #f5f5f5); cursor: pointer; font-size: 1.1rem;
        display: flex; align-items: center; justify-content: center;
      }
      .counter-btn:hover { background: var(--bg-hover, #e5e5e5); }
      .counter-value {
        min-width: 48px; text-align: center; font-size: 1.2rem; font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .counter-reset {
        font-size: .75rem; border: none; background: none; color: var(--text-muted, #888);
        cursor: pointer; text-decoration: underline;
      }
    `,
  }
);

// Composant JSX wrappé — utilisable dans JSX et lit-html avec typage complet
export const Counter = wrapElement(KCounter);
