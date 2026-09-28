// SSR entry. app.tsx imports the custom elements here too. On a server they register
// nothing (@fluixi/web-components puts a stand-in `customElements` there), and the tags render
// as plain HTML, with their string, number and boolean props as attributes, until the browser
// upgrades them.
import App from './app.js';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';

export function render(url: string): Promise<string> {
  return renderRequestAsync(App, { url });
}

export function renderStream(url: string): ReadableStream<Uint8Array> {
  return renderToBodyStream(App, { url });
}

import '@fluixi/start/server-fns';
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
