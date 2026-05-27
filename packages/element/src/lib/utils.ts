/**
 * @fileoverview Utility functions for @awc/element
 * @module @awc/element/utils
 */

import type { PropDefinition } from '@awc/dom/element';

/**
 * Convert camelCase property name to kebab-case attribute name.
 * e.g. "myProp" → "my-prop"
 */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Coerce a string attribute value to the declared type.
 * Boolean attributes: presence = true, absence = false.
 */
export function coerceAttribute(
  value: string | null,
  def: PropDefinition
): unknown {
  if (def.type === Boolean) {
    // Boolean attribute: present (even empty string) = true, null = false
    return value !== null;
  }
  if (value === null) {
    return def.default ?? null;
  }
  if (def.type === Number) {
    const n = Number(value);
    return Number.isNaN(n) ? def.default ?? 0 : n;
  }
  if (def.type === Object) {
    try {
      return JSON.parse(value);
    } catch {
      return def.default ?? null;
    }
  }
  // String (default)
  return value;
}

/**
 * Apply styles to a shadow root.
 * Uses adoptedStyleSheets where supported, falls back to <style> elements.
 */
export function applyStyles(
  root: ShadowRoot,
  styles: string | CSSStyleSheet | (string | CSSStyleSheet)[]
): void {
  const items = Array.isArray(styles) ? styles : [styles];
  const sheets: CSSStyleSheet[] = [];
  const strings: string[] = [];

  for (const item of items) {
    if (item instanceof CSSStyleSheet) {
      sheets.push(item);
    } else if (typeof item === 'string' && item.length > 0) {
      strings.push(item);
    }
  }

  // Convert string styles to CSSStyleSheet if constructable stylesheets are supported
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    for (const css of strings) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      sheets.push(sheet);
    }
    if (sheets.length > 0) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
    }
  } else {
    // Fallback: inject <style> elements
    for (const css of strings) {
      const el = document.createElement('style');
      el.textContent = css;
      root.appendChild(el);
    }
  }
}
