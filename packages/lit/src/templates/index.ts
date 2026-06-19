import { isSignal } from '@fluixi/reactive';
import { html as litHtml, svg as litSvg, TemplateResult } from 'lit';
import { auto } from '../directives/utils.js';
import { processValues } from './helpers.js';

/**
 * Check if a template value is in a binding position (attribute, event, property)
 * rather than a child content position.
 *
 * Lit-html template strings preceding a binding value end with patterns like:
 *   ' @click='   (event)
 *   ' .value='   (property)
 *   ' ?disabled=' (boolean attribute)
 *   ' class='    (attribute)
 *   ' href="'    (quoted attribute)
 *
 * Child content positions end with '>' or plain text.
 */
function isBindingPosition(precedingStr: string): boolean {
  // Trim trailing whitespace, then check if it ends with an attribute binding
  const trimmed = precedingStr.trimEnd();
  // Matches: @event=, .prop=, ?bool=, attr=, attr="
  return /(?:[@.?]?[\w-]+=["']?\s*$)/.test(trimmed);
}

/**
 * Wrapper around lit's html that automatically wraps signal accessors
 * with the litrx reactive directive for child content positions.
 *
 * Values in binding positions (attributes, events, properties) are passed
 * through unchanged — lit-html handles those natively.
 *
 * Returns a real lit TemplateResult synchronously.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: any[]
): TemplateResult {
  if (!Array.isArray(values)) {
    return values;
  }

  const processedValues = processValues(values, strings)
  // const processedValues = values.map((value, i) => {
  //   // If preceding string indicates a binding position (attr, event, prop),
  //   // pass the value through unchanged — lit handles these natively
  //   if (isBindingPosition(strings[i])) {
  //     return value;
  //   }
  //   // Child content position: wrap reactive accessors with litrx
  //   return auto(value);
  // });
  // console.log('html done')
  return litHtml(strings, ...processedValues);
}

/**
 * Wrapper around lit's svg that automatically wraps signal accessors
 */
export function svg(
  strings: TemplateStringsArray,
  ...values: any[]
): TemplateResult {
  const processedValues = values.map((value) => auto(value));
  return litSvg(strings, ...processedValues);
}

/**
 * Creates a reactive template helper that automatically wraps all signal accessors
 *
 * @param strings - Template strings
 * @param values - Template values (may include signal accessors)
 * @returns Tagged template result
 *
 * @example
 * ```typescript
 * import { rx } from '@fluixi/core';
 *
 * const [count, setCount] = createSignal(0);
 * const [name, setName] = createSignal('User');
 *
 * // Automatically wraps all signal accessors
 * return rx`
 *   <div>
 *     <p>Name: ${name}</p>
 *     <p>Count: ${count}</p>
 *   </div>
 * `;
 *
 * // Equivalent to:
 * return html`
 *   <div>
 *     <p>Name: ${rx(name)}</p>
 *     <p>Count: ${rx(count)}</p>
 *   </div>
 * `;
 * ```
 */
export function rx(strings: TemplateStringsArray, ...values: any[]): any {
  // Wrap all signal accessors with reactive directive
  const wrappedValues = values.map((value) => auto(value));

  // Call html with wrapped values
  return html(strings, ...wrappedValues);
}

// Re-export lit's nothing and other utilities
export { nothing } from 'lit';
