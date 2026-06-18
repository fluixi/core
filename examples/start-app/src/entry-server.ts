// SSR entry — @fluixi/start's dev/build/start load this and call `render(url)`.
import App from './app.js';
import { renderRequestAsync } from '@fluixi/server';

export function render(url: string): Promise<string> {
  return renderRequestAsync(App, { url });
}
