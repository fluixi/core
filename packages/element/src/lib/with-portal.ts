import { createPortal } from '@awc/dom';

/**
 * Wraps a `createComponent` result so that the rendered element is mounted into
 * a portal container (defaults to `document.body`) while preserving the full
 * generic prop types — no `any` leakage.
 *
 * @example
 * const Dialog = withPortal(DialogBase);
 * // Dialog has exactly the same prop types as DialogBase
 */
export function withPortal<TProps extends {}, TReturn extends HTMLElement = HTMLElement>(
  Component: (props?: TProps) => TReturn,
  getContainer: () => Element = () => document.body
): (props?: TProps) => TReturn {
  function PortalWrapper(props?: TProps): TReturn {
    return createPortal(
      Component({ ...(props ?? {}), framework: 'react' } as any as TProps),
      getContainer()
    ) as unknown as TReturn;
  }

  (PortalWrapper as any).displayName = (Component as any).displayName;
  (PortalWrapper as any).__tagName   = (Component as any).__tagName;
  (PortalWrapper as any).__wcWrapped = (Component as any).__wcWrapped;
  (PortalWrapper as any).__isPortal  = true;

  return PortalWrapper as unknown as (props?: TProps) => TReturn;
}

/**
 * Attaches sub-components to a base component function while preserving the
 * intersection type, so both the call signature and dot-access members are typed.
 *
 * @example
 * const Dialog = withSubComponents(withPortal(DialogBase), {
 *   Header: DialogHeader,
 *   Body:   DialogBody,
 * });
 * // Dialog(props) — fully typed; Dialog.Header(props) — fully typed
 */
export function withSubComponents<
  TBase extends (props?: any) => any,
  TSubs extends Record<string, (props?: any) => any>,
>(base: TBase, subComponents: TSubs): TBase & TSubs {
  return Object.assign(base, subComponents);
}
