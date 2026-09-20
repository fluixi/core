// HTTP interceptors: a request/response/error pipeline around fetch (Angular-style).
// Register interceptors to attach auth headers, handle 401s, log, or retry. Server-function
// RPC calls route through this automatically once any interceptor is added; use
// `fetchWithInterceptors` for your own data fetching too.
import { setServerFnFetch } from './server-fn.js';

export interface Interceptor {
  /** Transform the outgoing request (e.g. add an Authorization header). */
  request?: (request: Request) => Request | Promise<Request>;
  /** Transform the incoming response (e.g. unwrap, refresh-on-401). */
  response?: (response: Response, request: Request) => Response | Promise<Response>;
  /** Handle a network error; return a Response to recover, or nothing to rethrow. */
  error?: (error: unknown, request: Request) => Response | void | Promise<Response | void>;
}

const interceptors: Interceptor[] = [];

/** Register an interceptor. Returns a remover. The first call wires server-fn RPC through it. */
export function addInterceptor(interceptor: Interceptor): () => void {
  if (interceptors.length === 0) setServerFnFetch(fetchWithInterceptors as typeof fetch);
  interceptors.push(interceptor);
  return () => {
    const i = interceptors.indexOf(interceptor);
    if (i >= 0) interceptors.splice(i, 1);
  };
}

/** Remove all interceptors (and restore the plain fetch for server-fn RPC). */
export function clearInterceptors(): void {
  interceptors.length = 0;
  setServerFnFetch(((...a: Parameters<typeof fetch>) => fetch(...a)) as typeof fetch);
}

/** fetch() run through the interceptor chain: request → fetch → response, with error recovery. */
export async function fetchWithInterceptors(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let request = input instanceof Request && !init ? input : new Request(input, init);
  for (const i of interceptors) if (i.request) request = await i.request(request);

  let response: Response;
  try {
    response = await fetch(request);
  } catch (error) {
    for (const i of interceptors) {
      if (!i.error) continue;
      const recovered = await i.error(error, request);
      if (recovered) return recovered;
    }
    throw error;
  }

  for (const i of interceptors) if (i.response) response = await i.response(response, request);
  return response;
}
