import { TemplateResult, nothing, svg, html } from 'lit';
import { isSignal, isMemo, isResource, type Accessor } from '@awc/reactive/signal';
import { getNode, isStore } from '@awc/reactive/store';
import { litrx } from '../directives/litrx.js';
import {
  getLitEventName,
  isEventHandler,
  shouldSetAsProperty,
  SVG_ELEMENTS,
  toAttributeName,
  VOID_ELEMENTS,
} from '../../dom/utils.js';
import { ref } from 'lit/directives/ref.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { live } from 'lit/directives/live.js';
import { isAccessor, isPromise } from '../directives/utils.js';
import { iterateFn } from '../../dom/runtime.js';
import { asyncAppend } from '../directives/async-append.js';

function isTemplateResult(value: any): value is TemplateResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value._$litType$ !== 'undefined' &&
    Array.isArray(value.strings)
  );
}

// export function handleChildren<
//   T extends TemplateResult | string | number | any
// >(children: T | T[]): T | T[] {
//   if (Array.isArray(children)) {
//     return children.map(handleChildren) as any;
//   }
//   if (isTemplateResult(children)) {
//     children.values = processValues(children.values);
//   }
//   if (typeof children === 'function') {
//     const fn = children();
//     // console.log('handling children', fn);
//     return fn as any;
//   }
//   return children;
// }

function createSignalHandler() {
  const cache = new WeakMap();

  return {
    get(target: TemplateStringsArray, prop: string) {
      if (prop === 'raw') {
        return target.raw;
      }
      return target[prop as any];
    },
  };
}

// export function processTemplateResult(value: TemplateResult): TemplateResult {
//   if (value.values && value.values.length > 0) {
//     value.values = processValues(value.values);
//   }
//   return value;
// }

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
// export function isPromise<T = any>(v: unknown): v is Promise<T> {
//   return (
//     !!v && (typeof v === 'object' || typeof v === 'function') && 'then' in v
//   );
// }
/**
 * Recursively process values to wrap signals
 */
export function processValues(values: any[], strings?: TemplateStringsArray): any[] {
  if (!Array.isArray(values)) {
      return values
  }
  const data = values.map((_value, i) => {
    let value = _value;
    if (strings && isBindingPosition(strings[i])) {
      return value;
    }
    if (value instanceof Element) {
      return value
    }
    if (isSignal(value) || isMemo(value) || isResource(value)) {
      try {
        console.log('litrx')
        return litrx(value);
      } catch (e) {
        return value;
      }
    }

    if (isStore(value)) {
      return litrx(getNode(value)!);
    }

    // Process arrays recursively
    if (Array.isArray(value)) {
      return processValues(value);
    }

    // // For objects, check if any property is a signal
    // if (
    //   value &&
    //   typeof value === 'object' &&
    //   !isPromise(value)
    //   // && !('_$litDirective$' in value)
    // ) {
    //   // console.log('is object', value);
    //   return processObject(value);
    // }

    if (isTemplateResult(value)) {
      return processObject(value);
      // const l = value.values.slice(1);
      // console.log('l', l);
      // if (Array.isArray(l) && l.length === 1 && Array.isArray(l[0])) {
      //   console.log('is template result', l);
      //   value.values = [value.values[0], [processValues(l[0]! as any[])]];
      // } else {
      //   value.values = [value.values[0], processValues(value.values.slice(1))];
      // }
      // // value.values = [
      // //   value.values[0],
      // //   processValues(value.values.slice(1) as any),
      // // ];
      // return value;
    }

    if (typeof value === 'function' && !isPromise(value)) {
      // Unwrap function layers one step at a time.
      // Stop if we hit a reactive primitive (signal/memo/resource)
      // so it can be wrapped with litrx for fine-grained tracking.
      while (typeof value === 'function' && !isPromise(value)) {
        if (isSignal(value) || isMemo(value) || isResource(value)) {
          return litrx(value);
        }
        value = iterateFn(value);
        if (Array.isArray(value)) {
          value = processValues([...value], strings)
        }
      }
      if (isTemplateResult(value)) {
        value.values = processValues([...value.values], value.strings)
      }
    }

    return value;
  });
  // const result = await Promise.all(data);
  // // console.log('process done values', result);
  // return result;
  return data;
}

/**
 * Process array to wrap signals in nested arrays
 */
// function processArray(arr: any[], parent?: string): any[] {
//   const values = arr.map((_item) => {
//     let item = _item;
//     if (isSignal(item)) {
//       // console.log('is signal', item());
//       // if (typeof item() === 'function') {
//       //   return iterateFn(item());
//       // }
//       // return item();
//       return litrx(item);
//     }
//     const node = getNode(item);
//     if (node) {
//       return litrx(node);
//     }

//     if (Array.isArray(item)) {
//       // console.log('is array', item);
//       const data = processArray(item);
//       return data;
//     }

//     if (item && typeof item === 'object') {
//       // if (isPromise(item)) {
//       //   item = await item;
//       //   console.log('item is', item);
//       //   // item = asyncAppend(item);
//       // }
//       // if ('_$litDirective$' in item) {
//       //   return item;
//       // } else {
//       // }
//       return processObject(item, parent);
//     }
//     // if (typeof item === 'function') {
//     //   console.log('is fn array', item);
//     //   item = iterateFn(item);
//     //   if (item && item.values) {
//     //     item.values = processValues(item.values)
//     //   }
//     //   if (isPromise(item)) {
//     //     // item = asyncAppend(item);
//     //   }
//     // }
//     console.log('on arr', item);
//     return item;
//   });
//   return values;
//   // const result = await Promise.all(values);
//   // return result;
// }

/**
 * Process object to wrap signals in object properties
 */
function processObject(obj: Record<string, any>, strings_values?: TemplateStringsArray): any {
  const result: Record<string, any> = {};
  console.log('procees object', obj)
  let strings = strings_values;
  for (let [key, value] of Object.entries(obj)) {
    if (key !== 'strings' && key !== '_$litType$') {
      if (isSignal(value)) {
        result[key] = litrx(value);
      } else if (isStore(value)) {
        result[key] = litrx(getNode(value)!);
      } else if (Array.isArray(value)) {
        result[key] = processValues([...value], strings);
      } else if (
        value &&
        typeof value === 'object' &&
        !isTemplateResult(value)
      ) {
        result[key] = processObject(value, strings);
      } else {
        result[key] = value;
      }
    } else {
      strings = value
      result[key] = value;
    }
  }

  return result;
}

/**
 * Create a proper template strings array
 */
export function createTemplateStrings(parts: string[]): TemplateStringsArray {
  const strings = [...parts] as any;
  strings.raw = strings.map((s: string) => s);
  return strings;
}

export function buildElementTemplate(
  tag: string,
  props: Record<string, any>,
  children: any
): TemplateResult {
  const isSvg = SVG_ELEMENTS.has(tag);
  const templateFunc = isSvg ? svg : html; // Use our wrapped svg/html
  const isVoid = VOID_ELEMENTS.has(tag);

  const strings: string[] = [];
  const values: any[] = [];

  // Start opening tag
  strings.push(`<${tag}`);

  // console.log('element', Object.entries(props));
  // Process all props - NO NEED to manually wrap signals here
  // because our html/svg functions will do it automatically
  for (const [key, value] of Object.entries(props)) {
    // console.log('process array jsx template', key, value);
    if (value === undefined || value === null || key === 'children') {
      continue;
    }

    // if (key === 'children') {
    //   for (const child of value) {
    //     jsx('', child);
    //   }
    //   continue;
    // }

    // Handle ref
    if (key === 'ref') {
      strings[strings.length - 1] += ` `;
      values.push(ref(value));
      strings.push('');
      continue;
    }

    // Handle event handlers
    if (isEventHandler(key)) {
      const eventName = getLitEventName(key);
      strings[strings.length - 1] += ` @${eventName}=`;
      values.push(value);
      strings.push('');
      continue;
    }

    // Handle class/className
    if (key === 'class' || key === 'className') {
      strings[strings.length - 1] += ` class=`;

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        values.push(classMap(value));
      } else {
        // Let our html wrapper handle signals automatically
        values.push(value);
      }

      strings.push('');
      continue;
    }

    // Handle style
    if (key === 'style') {
      strings[strings.length - 1] += ` style=`;

      if (typeof value === 'object' && value !== null) {
        values.push(styleMap(value));
      } else {
        values.push(value);
      }

      strings.push('');
      continue;
    }

    // Handle boolean attributes
    if (typeof value === 'boolean') {
      if (value) {
        const attrName = toAttributeName(key);
        strings[strings.length - 1] += ` ${attrName}`;
      }
      continue;
    }

    // Handle properties (with . prefix)
    if (shouldSetAsProperty(tag, key)) {
      strings[strings.length - 1] += ` .${key}=`;
      values.push(live(value));
      strings.push('');
      continue;
    }

    // Handle other attributes - signals will be auto-wrapped by our html function
    const attrName = toAttributeName(key);
    strings[strings.length - 1] += ` ${attrName}=`;
    values.push(value);
    strings.push('');
  }

  // Close opening tag
  if (isVoid) {
    strings[strings.length - 1] += ` />`;
    return templateFunc(createTemplateStrings(strings), ...values);
  }

  strings[strings.length - 1] += `>`;

  // Add children - signals will be auto-wrapped
  if (children !== nothing && children !== null && children !== undefined) {
    strings[strings.length - 1] += ``;
    // handleChildren(children);
    values.push(children);
    strings.push(``);
  }

  // Add closing tag
  strings[strings.length - 1] += `</${tag}>`;

  return templateFunc(createTemplateStrings(strings), ...values);
}

/**
 * Example usage in templates:
 *
 * // Regular usage with signals
 * const count = createSignal(0);
 * const isActive = createSignal(true);
 *
 * // In a template:
 * html`
 *   <div class=${$if(isActive, 'active', 'inactive')}>
 *     Count: ${count}
 *     ${$each(() => items(), item => item.id, item => html`<li>${item.name}</li>`)}
 *   </div>
 * `
 *
 * // Or with automatic signal detection:
 * html`
 *   <div class=${isActive}>
 *     Count: ${count}
 *   </div>
 * `
 */
