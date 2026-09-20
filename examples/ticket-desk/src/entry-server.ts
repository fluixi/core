/**
 * SSR entry.
 *
 * The providers are registered per request rather than once at module load. That is the
 * hinge the whole DI story hangs on: `provideRoot` attaches to the root injector, and on
 * the server the root injector belongs to the request being rendered, so every request
 * builds its own `TicketRepo` and its own `AuthUser`.
 */
import App from './app.js';
import {
  renderRequestAsync,
  renderToBodyStream,
  setDataRedactor,
} from '@fluixi/server';
import { provideRoot } from '@fluixi/start/di';
import { rootProviders } from './services/providers.js';

/**
 * Keep server-only fields out of the payload the page ships with. The desk stores an
 * internal note on a ticket that agents see over the API but that must not appear in
 * `__FX_DATA__` for everyone to read.
 */
setDataRedactor((value) => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === 'object' && 'internalNote' in item
        ? { ...item, internalNote: undefined }
        : item,
    );
  }
  return value;
});

function withRequestScopedServices<T>(render: () => T): T {
  provideRoot(rootProviders());
  return render();
}

export function render(url: string): Promise<string> {
  return withRequestScopedServices(() => renderRequestAsync(App, { url }));
}

export function renderStream(url: string): ReadableStream<Uint8Array> {
  return withRequestScopedServices(() => renderToBodyStream(App, { url }));
}

// Registers every "use server" module so the RPC dispatcher shares this app's registry.
import '@fluixi/start/server-fns';
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';

// File-based API routes under src/api.
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
