import {
  createSignal,
  defineElement,
  wrapElement,
  html,
  onMount,
  useContext,
} from '@awc/kettlejs';
import { ThemeContext } from '../../context';

/**
 * @element my-counter
 * @attr {string} label - Texte du bouton
 */
export const MyCounter = defineElement(
  'my-counter',
  (props, { emit }) => {
    const [count, setCount] = createSignal(0);
    const [name] = props.name;
    const { theme } = useContext(ThemeContext);
    onMount(() => console.log('defineElement mounted'));
    return html`
      <div class="flex flex-col w-100 gap-2">
        <button
          @click=${() => {
            setCount((c) => c + 1);
            emit('countChange', count() + 1);
          }}
        >
          ${name}: ${count}
        </button>
        <p>Theme is: ${theme.text}</p>
      </div>
    `;
  },
  {
    props: {
      name: { type: String, default: 'Count' },
      test: { type: String, default: 'Count' },
    },
    events: {
      countChange: { detail: 0 as number },
    },
    lifecycle: {
      connectedCallback(host) {
        console.log('on connected callback', host);
      },
    },
    shadow: 'none',
    styles: `:host { display: block; }`,
  }
);

export const Counter = wrapElement(MyCounter);
