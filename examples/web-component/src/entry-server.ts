// SSR entry. The custom elements are not imported here: a server has no `customElements`,
// and the tags render as plain HTML that the browser upgrades once the client entry has
// registered them.
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
