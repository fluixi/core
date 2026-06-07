/**
 * @fileoverview Portal component for rendering content outside the component hierarchy in KettleJS
 * @module @fluixi/kettlejs/control-flow/Portal
 */

import { html, render as litRender, TemplateResult, nothing } from 'lit';
import { createEffect, createSignal, Accessor } from '@fluixi/reactive/signal';
import type { Component, ComponentProps } from '../../shared/types.js';
import { childToTemplate, normalizeAccessor, renderContent } from './utils.js';

/**
 * Props for the Portal component
 */
export interface $PortalProps<T extends ComponentProps = ComponentProps> {
  /**
   * Target element or selector to render into
   * Can be an HTMLElement, a CSS selector string, or an accessor returning either
   */
  mount?:
    | HTMLElement
    | string
    | Accessor<HTMLElement | string | null | undefined>
    | null;

  onUnmount?: (() => any)[];
  onMount?: (() => any)[];

  /**
   * Whether to use shadow DOM for the portal content
   * @default false
   */
  useShadow?: boolean;

  /**
   * Reference callback that receives the portal container element
   */
  ref?: (element: HTMLElement | null) => void;

  /**
   * Children to render in the portal
   */
  children: Component<T>;
}

/**
 * Resolves a mount target to an HTMLElement
 * @param {HTMLElement | string | null | undefined} target - Target to resolve
 * @returns {HTMLElement | null} Resolved element or null
 */
function resolveMount(
  target: HTMLElement | string | null | undefined
): HTMLElement | null {
  if (!target) {
    return document.body;
  }

  if (typeof target === 'string') {
    const element = document.querySelector(target);
    if (!element) {
      console.warn(`Portal: Could not find element with selector "${target}"`);
      return document.body;
    }
    return element as HTMLElement;
  }

  return target;
}

/**
 * Portal component for rendering content outside the component hierarchy
 *
 * Renders children into a different part of the DOM tree, useful for modals,
 * tooltips, dropdowns, and other UI elements that need to break out of their
 * parent container's styling or stacking context.
 *
 * @param {$PortalProps} props - Component props
 * @returns {TemplateResult | typeof nothing} Empty template (actual content is portaled)
 *
 * @example
 * ```typescript
 * // Basic portal to document.body
 * const Modal = (props: { isOpen: boolean }) => {
 *   return Show({
 *     when: props.isOpen,
 *     children: $portal({
 *       children: html`
 *         <div class="modal-overlay">
 *           <div class="modal-content">
 *             <h2>Modal Title</h2>
 *             <p>Modal content goes here</p>
 *           </div>
 *         </div>
 *       `
 *     })
 *   });
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Portal to specific element
 * const Tooltip = () => {
 *   return html`
 *     ${$portal({
 *       mount: '#tooltip-container',
 *       children: html`<div class="tooltip">Tooltip text</div>`
 *     })}
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Dynamic mount target
 * const DynamicPortal = () => {
 *   const [target, setTarget] = createSignal<HTMLElement | null>(null);
 *
 *   return html`
 *     <div>
 *       <div id="target-1" ref=${(el: HTMLElement) => setTarget(el)}></div>
 *       ${$portal({
 *         mount: target,
 *         children: html`<p>Portaled content</p>`
 *       })}
 *     </div>
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // With shadow DOM
 * const IsolatedPortal = () => {
 *   return html`
 *     ${$portal({
 *       useShadow: true,
 *       children: html`
 *         <style>
 *           .isolated { color: red; }
 *         </style>
 *         <div class="isolated">Isolated styles</div>
 *       `
 *     })}
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // With ref callback
 * const PortalWithRef = () => {
 *   const handleRef = (element: HTMLElement | null) => {
 *     console.log('Portal container:', element);
 *   };
 *
 *   return html`
 *     ${$portal({
 *       ref: handleRef,
 *       children: html`<div>Content</div>`
 *     })}
 *   `;
 * };
 * ```
 */
export function $portal(props: $PortalProps): TemplateResult | typeof nothing {
  const [containerElement, setContainer] = createSignal<HTMLElement | null>(
    null
  );
  let portalContainer: HTMLElement | null = null;
  let renderRoot: HTMLElement | ShadowRoot | null = null;

  // Create portal container
  const createPortalContainer = (mountTarget: HTMLElement) => {
    const container = document.createElement('div');
    container.setAttribute('data-kettle-portal', 'true');

    if (props.useShadow) {
      renderRoot = container.attachShadow({ mode: 'open' });
    } else {
      renderRoot = container;
    }

    mountTarget.appendChild(container);
    setContainer(container);
    return container;
  };

  // Clean up portal
  const cleanup = () => {
    if (portalContainer) {
      if (renderRoot) {
        // Clear content
        if (renderRoot instanceof ShadowRoot) {
          renderRoot.innerHTML = '';
        } else {
          renderRoot.innerHTML = '';
        }
      }

      // Remove container from DOM
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }

      if (props.ref) {
        props.ref(null);
      }

      portalContainer = null;
      renderRoot = null;
    }
  };

  // Set up portal rendering
  createEffect(() => {
    // Resolve mount target
    const mountAccessor = normalizeAccessor(props.mount || document.body);
    const mountValue = mountAccessor();
    const mountTarget = resolveMount(mountValue);
    portalContainer = containerElement();

    if (!mountTarget) {
      console.warn('Portal: Invalid mount target');
      return;
    }

    // Create container if needed
    if (!portalContainer) {
      portalContainer = createPortalContainer(mountTarget);

      if (props.ref) {
        props.ref(portalContainer);
      }
    } else if (portalContainer.parentNode !== mountTarget) {
      // Mount target changed - move container
      cleanup();
      portalContainer = createPortalContainer(mountTarget);

      if (props.ref) {
        props.ref(portalContainer);
      }
    }

    // Render content into portal
    if (renderRoot) {
      const content = renderContent(props.children);
      const template = childToTemplate(content);
      litRender(template, renderRoot as any);
    }
  });

  if (props.onUnmount) {
    props.onUnmount.push(cleanup);
  }

  // // Register cleanup on unmount
  // onUnmount(() => {
  //   cleanup();
  // });

  // Return nothing - content is rendered in portal
  return nothing;
}

/**
 * Creates a portal with a fixed mount target
 *
 * @param {HTMLElement | string} mountTarget - Fixed mount target element or selector
 * @returns {(props: Omit<$PortalProps, 'mount'>) => TemplateResult | typeof nothing} Portal component with fixed mount
 *
 * @example
 * ```typescript
 * // Create a portal that always renders to #modal-root
 * const ModalPortal = createFixedPortal('#modal-root');
 *
 * const MyModal = () => {
 *   return html`
 *     ${Modal$portal({
 *       children: html`<div class="modal">Modal content</div>`
 *     })}
 *   `;
 * };
 * ```
 */
export function createFixedPortal(
  mountTarget: HTMLElement | string
): (props: Omit<$PortalProps, 'mount'>) => TemplateResult | typeof nothing {
  return (props: Omit<$PortalProps, 'mount'>) => {
    return $portal({
      ...props,
      mount: mountTarget,
    });
  };
}

/**
 * Global portal root element getter/setter
 */
let globalPortalRoot: HTMLElement | null = null;

/**
 * Sets the global portal root element
 *
 * @param {HTMLElement | string | null} root - Root element or selector
 *
 * @example
 * ```typescript
 * // In your app initialization
 * setGlobalPortalRoot('#portal-root');
 * ```
 */
export function setGlobalPortalRoot(root: HTMLElement | string | null): void {
  if (!root) {
    globalPortalRoot = null;
    return;
  }

  globalPortalRoot =
    typeof root === 'string'
      ? (document.querySelector(root) as HTMLElement)
      : root;

  if (!globalPortalRoot) {
    console.warn('setGlobalPortalRoot: Could not find element');
  }
}

/**
 * Gets the global portal root element
 *
 * @returns {HTMLElement | null} Global portal root or null
 */
export function getGlobalPortalRoot(): HTMLElement | null {
  return globalPortalRoot;
}

/**
 * Portal component that uses the global portal root
 *
 * @param {Omit<$PortalProps, 'mount'>} props - Portal props without mount
 * @returns {TemplateResult | typeof nothing} Portal template
 *
 * @example
 * ```typescript
 * // Set up global root once
 * setGlobalPortalRoot('#portal-root');
 *
 * // Use GlobalPortal anywhere
 * const MyComponent = () => {
 *   return html`
 *     ${Global$portal({
 *       children: html`<div>Portaled to global root</div>`
 *     })}
 *   `;
 * };
 * ```
 */
export function $globalPortal(
  props: Omit<$PortalProps, 'mount'>
): TemplateResult | typeof nothing {
  return $portal({
    ...props,
    mount: globalPortalRoot || document.body,
  });
}
