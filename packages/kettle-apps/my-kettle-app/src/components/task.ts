import { html } from '@awc/kettlejs';
import { ThemeConsumer } from '../context';

export const TaskComponent = () => {
  return html`
    ${ThemeConsumer({
      children: (value) => html`
        <div class="flex flex-col">
          <div class="theme">${value.theme.text}</div>
          <button class="toggle-theme" @click=${value.toggleTheme}>
            toggle
          </button>
        </div>
      `,
    })}
  `;
};
