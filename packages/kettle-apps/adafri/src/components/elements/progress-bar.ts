// Barre de progression — web component avec attribut réactif
// Démontre : props numériques, attribut booléen, styles encapsulés, pas d'events
import {
  defineElement,
  wrapElement,
  html,
  createEffect,
  createMemo,
} from '@awc/kettlejs';

/**
 * @element k-progress
 * @attr {number} value - Pourcentage de progression (0-100)
 * @attr {string} color - Couleur de la barre (défaut : #3b82f6)
 * @attr {boolean} striped - Active l'animation rayée
 */
export const KProgress = defineElement(
  'k-progress',
  (props) => {
    const [value] = props.value;
    const [color] = props.color;
    const [striped] = props.striped;

    // Clamp la valeur entre 0 et 100
    const clamped = () => Math.max(0, Math.min(100, value()));

    return createMemo(
      () => html`
        <div class="progress-track">
          <div
            class="progress-fill ${striped() ? 'striped' : ''}"
            style="width:${clamped()}%;background:${color()}"
          ></div>
        </div>
        <span class="progress-text">${clamped}%</span>
      `
    );
  },
  {
    props: {
      value: { type: Number, default: 0 },
      color: { type: String, default: '#3b82f6' },
      striped: { type: Boolean, default: false },
    },
    styles: `
      :host { display: flex; align-items: center; gap: .5rem; }
      .progress-track {
        flex: 1; height: 12px; background: var(--bg-secondary, #e5e7eb);
        border-radius: 6px; overflow: hidden;
      }
      .progress-fill {
        height: 100%; border-radius: 6px; transition: width .3s ease;
      }
      .progress-fill.striped {
        background-image: linear-gradient(
          45deg, rgba(255,255,255,.15) 25%, transparent 25%,
          transparent 50%, rgba(255,255,255,.15) 50%,
          rgba(255,255,255,.15) 75%, transparent 75%, transparent
        );
        background-size: 1rem 1rem;
        animation: stripe-anim .6s linear infinite;
      }
      @keyframes stripe-anim { from { background-position: 1rem 0; } to { background-position: 0 0; } }
      .progress-text { font-size: .8rem; font-weight: 600; min-width: 36px; text-align: right; }
    `,
  }
);

// Wrapper JSX typé
export const ProgressBar = wrapElement(KProgress);
