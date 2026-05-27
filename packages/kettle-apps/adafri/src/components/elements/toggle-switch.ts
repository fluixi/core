// Interrupteur toggle — web component avec event et form association
// Démontre : props booléennes, events typés, formAssociated, lifecycle
import { defineElement, wrapElement, createSignal, html } from '@awc/kettlejs';
import { createMemo } from '@awc/reactive';
import { classMap } from '@awc/dom';

/**
 * @element k-toggle
 * @attr {string} label - Libellé de l'interrupteur
 * @attr {boolean} checked - État initial
 * @fires toggle - Émis quand l'état change, detail = booléen
 */
export const KToggle = defineElement(
  'k-toggle',
  (props, { emit }) => {
    const [label] = props.label;
    const [initialChecked] = props.checked;
    const [on, setOn] = createSignal(initialChecked());
    const active = createMemo(() => on());

    const handleClick = () => {
      setOn(!on());
      emit('toggle', on());
    };

    return html`
      <label class="toggle-wrapper" @click=${handleClick}>
        <div class=${classMap({ active: active, "toggle-track": true })}>
          <div class="toggle-thumb"></div>
        </div>
        <span class="toggle-label">${label}</span>
      </label>
    `;
  },
  {
    props: {
      label: { type: String, default: 'Toggle' },
      checked: { type: Boolean, default: false },
    },
    events: {
      toggle: { detail: false as boolean },
    },
    lifecycle: {
      connectedCallback(host) {
        console.log('[k-toggle] connecté', host.tagName);
      },
    },
    // shadow: 'none',
    styles: `
      .toggle-wrapper {
        display: inline-flex; align-items: center; gap: .5rem; cursor: pointer;
        user-select: none;
      }
      .toggle-track {
        width: 44px; height: 24px; border-radius: 12px;
        background: var(--bg-secondary, #ccc); position: relative;
        transition: background .2s ease;
      }
      .toggle-track.active { background: #3b82f6; }
      .toggle-thumb {
        width: 20px; height: 20px; border-radius: 50%;
        background: white; position: absolute; top: 2px; left: 2px;
        transition: transform .2s ease; box-shadow: 0 1px 3px rgba(0,0,0,.2);
      }
      .toggle-track.active .toggle-thumb { transform: translateX(20px); }
      .toggle-label { font-size: .9rem; }
    `,
  }
);

// Wrapper JSX typé
export const Toggle = wrapElement(KToggle);
