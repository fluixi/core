/**
 * @fileoverview DOM utilities for Fluixi
 * @module @fluixi/core/dom
 *
 * This module provides utilities for DOM manipulation and queries.
 */

/**
 * Convert camelCase to kebab-case for attribute names
 */
export function toAttributeName(key: string): string {
  // Special case for aria and data attributes
  if (key.startsWith('aria-') || key.startsWith('data-')) {
    return key;
  }

  // Handle SVG attributes with mixed case (e.g., viewBox)
  if (/[A-Z]/.test(key)) {
    return key.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  return key;
}

/**
 * Check if key is an event handler
 */
export function isEventHandler(key: string): boolean {
  return key.startsWith('@') || (key.startsWith('on') && key.length > 2);
}

/**
 * Get Lit event name from key
 */
export function getLitEventName(key: string): string {
  if (key.startsWith('@')) {
    return key.slice(1);
  }
  if (key.startsWith('on')) {
    const eventName = key.slice(2);
    return eventName.toLowerCase();
  }
  return key;
}

/**
 * Check if attribute should be set as property
 */
export function shouldSetAsProperty(element: string, key: string): boolean {
  // These are always set as properties in Lit
  const propertyAttributes = new Set([
    'checked',
    'value',
    'selected',
    'disabled',
    'readonly',
    'required',
    'multiple',
    'open',
    'contenteditable',
    'draggable',
    'spellcheck',
  ]);

  // These are HTML elements where certain attributes should be properties
  const elementSpecificProps: Record<string, Set<string>> = {
    input: new Set(['value', 'checked', 'indeterminate']),
    textarea: new Set(['value']),
    select: new Set(['value']),
    option: new Set(['selected', 'value']),
    audio: new Set(['volume', 'currentTime', 'paused']),
    video: new Set(['volume', 'currentTime', 'paused']),
    img: new Set(['src', 'srcset']),
    iframe: new Set(['src']),
    a: new Set(['href']),
  };

  return (
    propertyAttributes.has(key) ||
    (elementSpecificProps[element] && elementSpecificProps[element].has(key))
  );
}

/**
 * Self-closing HTML tags
 */
export const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * SVG namespace elements
 */
export const SVG_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'text',
  'tspan',
  'use',
  'defs',
  'symbol',
  'mask',
  'clipPath',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'filter',
  'feGaussianBlur',
  'feOffset',
  'feMerge',
  'feMergeNode',
  'foreignObject',
]);

// SVG namespace
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Returns true for custom elements (tag name contains a hyphen per the Web
 * Components spec — e.g. `adf-accounts-selector`).
 */
export function isCustomElement(element: Element): boolean {
  return element.localName.includes('-');
}

/**
 * Set a prop on an element, choosing between DOM property assignment and
 * setAttribute based on:
 *   - Custom elements always receive complex values (object/array) as DOM
 *     properties so that Lit components get the rich value, not a serialised
 *     string.
 *   - Primitives (string/number/boolean) and standard HTML elements go through
 *     the normal setAttribute path.
 */
export function applyElementProp(
  element: Element,
  name: string,
  value: any,
  isSVG = false,
): void {
  if (value == null) {
    element.removeAttribute(name);
    return;
  }
  // For custom elements: set objects and arrays directly as DOM properties so
  // Lit (and other web-component libraries) receive the rich value.
  // if(element.name === 'stocked_quantity' && name === 'value'){
  //   console.log(
  //     'apply custom element prop',
  //     name,
  //     value,
  //     (element as any)[name]
  //   );

  // }
  if (isCustomElement(element)) {
    // if ((element as any)[name]!==value) 
      (element as any)[name] = value;
    return;
  }
  setAttribute(element, name, value, isSVG);
}

// Properties that should be set as properties, not attributes
export const JSX_PROPERTIES = new Set([
  'className',
  'value',
  'checked',
  'selected',
  'innerHTML',
  'innerText',
  'textContent',
  'indeterminate',
  'htmlFor',
]);
/**
 * Queries a single element with type safety
 *
 * @template T - Element type
 * @param {string} selector - CSS selector
 * @param {Element | Document} root - Root element (default: document)
 * @returns {T | null} Found element or null
 *
 * @example
 * ```typescript
 * import { query } from '@fluixi/core/dom';
 *
 * const button = query<HTMLButtonElement>('#my-button');
 * button?.click();
 * ```
 */
export function query<T extends Element = Element>(
  selector: string,
  root: Element | Document = document
): T | null {
  return root.querySelector<T>(selector);
}

/**
 * Queries all matching elements with type safety
 *
 * @template T - Element type
 * @param {string} selector - CSS selector
 * @param {Element | Document} root - Root element (default: document)
 * @returns {T[]} Array of matching elements
 *
 * @example
 * ```typescript
 * import { queryAll } from '@fluixi/core/dom';
 *
 * const buttons = queryAll<HTMLButtonElement>('button');
 * buttons.forEach(btn => btn.disabled = true);
 * ```
 */
export function queryAll<T extends Element = Element>(
  selector: string,
  root: Element | Document = document
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/**
 * Queries the closest matching ancestor element
 *
 * @template T - Element type
 * @param {Element} element - Starting element
 * @param {string} selector - CSS selector
 * @returns {T | null} Closest matching ancestor or null
 *
 * @example
 * ```typescript
 * import { closest } from '@fluixi/core/dom';
 *
 * const form = closest<HTMLFormElement>(button, 'form');
 * form?.submit();
 * ```
 */
export function closest<T extends Element = Element>(
  element: Element,
  selector: string
): T | null {
  return element.closest<T>(selector);
}

/**
 * Adds one or more classes to an element
 *
 * @param {Element} element - Target element
 * @param {...string} classes - Classes to add
 *
 * @example
 * ```typescript
 * import { addClass } from '@fluixi/core/dom';
 *
 * addClass(element, 'active', 'visible');
 * ```
 */
export function addClass(element: Element, ...classes: string[]): void {
  element.classList.add(...classes);
}

/**
 * Removes one or more classes from an element
 *
 * @param {Element} element - Target element
 * @param {...string} classes - Classes to remove
 *
 * @example
 * ```typescript
 * import { removeClass } from '@fluixi/core/dom';
 *
 * removeClass(element, 'active', 'visible');
 * ```
 */
export function removeClass(element: Element, ...classes: string[]): void {
  element.classList.remove(...classes);
}

/**
 * Toggles one or more classes on an element
 *
 * @param {Element} element - Target element
 * @param {...string} classes - Classes to toggle
 *
 * @example
 * ```typescript
 * import { toggleClass } from '@fluixi/core/dom';
 *
 * toggleClass(element, 'active');
 * ```
 */
export function toggleClass(element: Element, ...classes: string[]): void {
  classes.forEach((cls) => element.classList.toggle(cls));
}

/**
 * Checks if element has a class
 *
 * @param {Element} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean} True if element has the class
 *
 * @example
 * ```typescript
 * import { hasClass } from '@fluixi/core/dom';
 *
 * if (hasClass(element, 'active')) {
 *   console.log('Element is active');
 * }
 * ```
 */
export function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Sets an attribute on an element
 *
 * @param {Element} element - Target element
 * @param {string} name - Attribute name
 * @param {string | number | boolean} value - Attribute value
 *
 * @example
 * ```typescript
 * import { setAttribute } from '@fluixi/core/dom';
 *
 * setAttribute(input, 'disabled', true);
 * setAttribute(div, 'data-id', '123');
 * ```
 */
export function setAttribute(
  element: Element,
  name: string,
  value: unknown,
  isSVG = false
): void {
  // null/undefined/false REMOVE the attribute (a conditionally-absent attribute must be omitted,
  // not rendered as ="undefined"/"false"); true renders as the empty string. Matches Solid's
  // dom-expressions semantics.
  if (value == null || value === false) {
    element.removeAttribute(name);
    return;
  }
  if (value === true) {
    element.setAttribute(name, '');
    return;
  }
  if (typeof value === 'object') {
    element.setAttribute(name, JSON.stringify(value));
    return;
  }
  element.setAttribute(name, String(value));
}

// /**
//  * Set an attribute or property on an element
//  */
// export function setAttribute(
//   element: Element,
//   name: string,
//   value: any,
//   isSVG = false
// ): void {
//   if (value == null || value === false) {
//     element.removeAttribute(name);
//     return;
//   }

//   if (value === true) {
//     element.setAttribute(name, '');
//     return;
//   }

//   element.setAttribute(name, String(value));
// }

/**
 * Gets an attribute from an element
 *
 * @param {Element} element - Target element
 * @param {string} name - Attribute name
 * @returns {string | null} Attribute value or null
 *
 * @example
 * ```typescript
 * import { getAttribute } from '@fluixi/core/dom';
 *
 * const id = getAttribute(div, 'data-id');
 * ```
 */
export function getAttribute(element: Element, name: string): string | null {
  return element.getAttribute(name);
}

/**
 * Removes an attribute from an element
 *
 * @param {Element} element - Target element
 * @param {string} name - Attribute name
 *
 * @example
 * ```typescript
 * import { removeAttribute } from '@fluixi/core/dom';
 *
 * removeAttribute(input, 'disabled');
 * ```
 */
export function removeAttribute(element: Element, name: string): void {
  element.removeAttribute(name);
}

/**
 * Sets multiple styles on an element
 *
 * @param {HTMLElement} element - Target element
 * @param {Partial<CSSStyleDeclaration>} styles - Styles object
 *
 * @example
 * ```typescript
 * import { setStyles } from '@fluixi/core/dom';
 *
 * setStyles(div, {
 *   backgroundColor: 'red',
 *   padding: '10px',
 *   display: 'flex'
 * });
 * ```
 */
export function setStyles(
  element: any,
  styles: Partial<CSSStyleDeclaration>
): void {
  Object.assign(element.style, styles);
}

/**
 * Gets computed style of an element
 *
 * @param {Element} element - Target element
 * @param {string} property - CSS property name
 * @returns {string} Computed style value
 *
 * @example
 * ```typescript
 * import { getStyle } from '@fluixi/core/dom';
 *
 * const color = getStyle(div, 'backgroundColor');
 * ```
 */
export function getStyle(element: Element, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Creates an element with attributes and children
 *
 * @template K - Element tag name
 * @param {K} tagName - HTML tag name
 * @param {Record<string, any>} attributes - Element attributes
 * @param {...(Node | string)} children - Child nodes or text
 * @returns {HTMLElementTagNameMap[K]} Created element
 *
 * @example
 * ```typescript
 * import { createElement } from '@fluixi/core/dom';
 *
 * const button = createElement('button',
 *   { class: 'btn', disabled: true },
 *   'Click me'
 * );
 * ```
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Record<string, any> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class' || key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      setStyles(element as HTMLElement, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.slice(2).toLowerCase();
      element.addEventListener(event, value);
    } else {
      setAttribute(element, key, value);
    }
  });

  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Removes all children from an element
 *
 * @param {Element} element - Target element
 *
 * @example
 * ```typescript
 * import { removeChildren } from '@fluixi/core/dom';
 *
 * removeChildren(container);
 * ```
 */
export function removeChildren(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Appends multiple children to an element
 *
 * @param {Element} parent - Parent element
 * @param {...(Node | string)} children - Children to append
 *
 * @example
 * ```typescript
 * import { appendChildren } from '@fluixi/core/dom';
 *
 * appendChildren(container,
 *   createElement('div', {}, 'Child 1'),
 *   'Text node',
 *   createElement('span', {}, 'Child 2')
 * );
 * ```
 */
export function appendChildren(
  parent: Element,
  ...children: (Node | string)[]
): void {
  children.forEach((child) => {
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  });
}

/**
 * Checks if element is visible in the viewport
 *
 * @param {Element} element - Target element
 * @returns {boolean} True if element is visible
 *
 * @example
 * ```typescript
 * import { isVisible } from '@fluixi/core/dom';
 *
 * if (isVisible(element)) {
 *   console.log('Element is in viewport');
 * }
 * ```
 */
export function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/**
 * Scrolls element into view smoothly
 *
 * @param {Element} element - Target element
 * @param {ScrollIntoViewOptions} options - Scroll options
 *
 * @example
 * ```typescript
 * import { scrollIntoView } from '@fluixi/core/dom';
 *
 * scrollIntoView(element, { behavior: 'smooth', block: 'center' });
 * ```
 */
export function scrollIntoView(
  element: Element,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'nearest' }
): void {
  element.scrollIntoView(options);
}

/**
 * Gets element's offset relative to document
 *
 * @param {Element} element - Target element
 * @returns {{ top: number; left: number }} Offset coordinates
 *
 * @example
 * ```typescript
 * import { getOffset } from '@fluixi/core/dom';
 *
 * const { top, left } = getOffset(element);
 * ```
 */
export function getOffset(element: Element): { top: number; left: number } {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset,
  };
}

/**
 * Delegates event handling to a parent element
 *
 * @template K - Event type
 * @param {Element} parent - Parent element
 * @param {K} eventName - Event name
 * @param {string} selector - Child selector
 * @param {(event: Event, target: Element) => void} handler - Event handler
 * @returns {() => void} Cleanup function
 *
 * @example
 * ```typescript
 * import { delegate } from '@fluixi/core/dom';
 *
 * const cleanup = delegate(list, 'click', '.item', (event, target) => {
 *   console.log('Clicked item:', target);
 * });
 * ```
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  parent: Element,
  eventName: K,
  selector: string,
  handler: (event: HTMLElementEventMap[K], target: Element) => void
): () => void {
  const listener = (event: Event) => {
    const target = (event.target as Element).closest(selector);
    if (target && parent.contains(target)) {
      handler(event as HTMLElementEventMap[K], target);
    }
  };

  parent.addEventListener(eventName, listener as EventListener);

  return () => {
    parent.removeEventListener(eventName, listener as EventListener);
  };
}

/**
 * Waits for an element to appear in the DOM
 *
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Element>} Promise that resolves with the element
 *
 * @example
 * ```typescript
 * import { waitForElement } from '@fluixi/core/dom';
 *
 * const element = await waitForElement('#dynamic-content');
 * ```
 */
export function waitForElement(
  selector: string,
  timeout: number = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = query(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = query(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Observes element intersection with viewport
 *
 * @param {Element} element - Target element
 * @param {(isIntersecting: boolean) => void} callback - Callback function
 * @param {IntersectionObserverInit} options - Observer options
 * @returns {() => void} Cleanup function
 *
 * @example
 * ```typescript
 * import { observeIntersection } from '@fluixi/core/dom';
 *
 * const cleanup = observeIntersection(element, (isIntersecting) => {
 *   console.log('Element visible:', isIntersecting);
 * });
 * ```
 */
export function observeIntersection(
  element: Element,
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {}
): () => void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      callback(entry.isIntersecting);
    });
  }, options);

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}

/**
 * Observes element size changes
 *
 * @param {Element} element - Target element
 * @param {(entry: ResizeObserverEntry) => void} callback - Callback function
 * @returns {() => void} Cleanup function
 *
 * @example
 * ```typescript
 * import { observeResize } from '@fluixi/core/dom';
 *
 * const cleanup = observeResize(element, (entry) => {
 *   console.log('New size:', entry.contentRect.width, entry.contentRect.height);
 * });
 * ```
 */
export function observeResize(
  element: Element,
  callback: (entry: ResizeObserverEntry) => void
): () => void {
  const observer = new ResizeObserver((entries) => {
    entries.forEach(callback);
  });

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}

const REACT_ELEMENT_TYPE =
  typeof Symbol === 'function' && Symbol.for
    ? Symbol.for('react.element')
    : 0xeac7;

export function isReactElement(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof === REACT_ELEMENT_TYPE
  );
}

export function isLitTemplateResult(value: any): boolean {
  return (
    value &&
    typeof value === 'object' &&
    value.strings &&
    Array.isArray(value.strings) &&
    value.values &&
    Array.isArray(value.values)
  );
}

export function isTemplateFactory(value: any): boolean {
  if (typeof value !== 'function') return false;

  try {
    const result = value();
    return isLitTemplateResult(result);
  } catch {
    return false;
  }
}

export function isJSXTemplate(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value.$$typeof === 'template' || typeof value.type === 'function')
  );
}

export function isDOMNode(value: any): value is Node {
  return value instanceof Node;
}

export function registerGlobal(key: string, value: any, _Key = 'Fluixi') {
  if (typeof globalThis !== 'undefined') {
    if (typeof (globalThis as any)[_Key] === 'undefined') {
      (globalThis as any)[_Key] = {};
    }
    if (typeof (globalThis as any)[_Key][key] === 'undefined') {
      (globalThis as any)[_Key][key] = value;
    }
  }
}
export function getGlobal(key: string, value?: any, _Key = 'Fluixi') {
  if (typeof globalThis !== 'undefined') {
    if (typeof (globalThis as any)[_Key] !== 'undefined') {
      if (typeof (globalThis as any)[_Key][key] !== 'undefined') {
        return (globalThis as any)[_Key][key];
      }
    }
  }
  return value;
}
