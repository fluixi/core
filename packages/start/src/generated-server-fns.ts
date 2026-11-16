/**
 * The registry of `"use server"` functions found in this app.
 *
 * ```ts
 * import { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fns';
 * ```
 *
 * A typed stand-in: the compiler's server-function plugin intercepts this specifier and
 * serves the generated registry. It exists as a real module so the types ship with the
 * package instead of an ambient `declare module` written into your `src/`.
 *
 * `virtual:fluixi-server-fns` still resolves.
 */
function missingPlugin(): never {
  throw new Error(
    "[fluixi] '@fluixi/start/server-fns' was imported but the server-function plugin did not " +
      'replace it. Build with `fluixi build`/`fluixi dev`, or add the @fluixi/start plugins to ' +
      'your Vite config.',
  );
}

/** Whether this request is an RPC call to a `"use server"` function. */
export function isServerFnRequest(_request: Request): boolean {
  missingPlugin();
}

/** Run the addressed server function and return its response. */
export function handleServerFn(_request: Request, _options?: { production?: boolean }): Promise<Response> {
  missingPlugin();
}
