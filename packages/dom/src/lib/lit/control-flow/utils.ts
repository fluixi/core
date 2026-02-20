import { Component, ComponentChild, html } from '@awc/dom';
import { Accessor } from '@awc/reactive';
import { nothing, TemplateResult } from 'lit';

/**
 * Normalizes a value or accessor to an accessor function
 * @template T - Type of the value
 * @param {T | Accessor<T>} value - Value or accessor to normalize
 * @returns {Accessor<T>} Accessor function
 */
export function normalizeAccessor<T>(value: T | Accessor<T>): Accessor<T> {
  return typeof value === 'function'
    ? (value as Accessor<T>)
    : ((() => value) as Accessor<T>);
}

/**
 * Renders content - handles both static values and functions
 * @param {ComponentChild | (() => ComponentChild)} content - Content to render
 * @returns {ComponentChild} Rendered content
 */
export function renderContent<T>(
  content: Component<T>,
  props: any = null
): Component<T> {
  return typeof content === 'function'
    ? props !== null
      ? (content as any)(props)
      : (content as any)()
    : content;
}

/**
 * Converts component children to a TemplateResult
 * @param {ComponentChild} child - Child content to convert
 * @returns {TemplateResult | typeof nothing} Lit template result
 */
export function childToTemplate(
  child: ComponentChild
): TemplateResult | typeof nothing {
  if (child === null || child === undefined || child === false) {
    return nothing;
  }

  if (typeof child === 'string' || typeof child === 'number') {
    return html`${child}`;
  }

  if (Array.isArray(child)) {
    return html`${child.map((c) => childToTemplate(c))}`;
  }

  return child as TemplateResult;
  // return html`${child}` as TemplateResult;
}

export function isTruthy<T>(
  value: T | undefined | null | false
): value is NonNullable<T> {
  return value !== null && value !== undefined && value !== false;
}
