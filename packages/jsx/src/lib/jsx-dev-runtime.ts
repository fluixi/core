import {
  jsx,
  jsxs,
  Fragment,
  JSXComponent,
  JSXProps,
  JSXElement,
} from './jsx-runtime.js';

export { Fragment, jsx, jsxs };

/**
 * jsxDEV - development version
 */
export function jsxDEV(
  type: string | JSXComponent,
  props: JSXProps | null,
  key?: string,
  isStaticChildren?: boolean,
  source?: { fileName: string; lineNumber: number; columnNumber: number },
  self?: any
): JSXElement {
  return jsx(type, props, key);
}

function validateProps(tag: any, props: any): void {
  if (typeof tag === 'string') {
    const validProps = getValidDOMProps(tag);

    for (const prop in props) {
      if (
        !validProps.has(prop) &&
        !prop.startsWith('on') &&
        prop !== 'children'
      ) {
        console.warn(`Invalid prop "${prop}" on <${tag}> element`);
      }
    }
  }
}

function getValidDOMProps(tag: string): Set<string> {
  const commonProps = new Set([
    'className',
    'class',
    'style',
    'id',
    'key',
    'ref',
    'title',
    'role',
    'tabIndex',
    'disabled',
    'hidden',
    'src',
    'href',
    'alt',
    'target',
    'type',
    'value',
    'checked',
    'selected',
    'placeholder',
    'readOnly',
    'required',
    'min',
    'max',
    'step',
    'pattern',
    'autoComplete',
    'autoFocus',
    'cols',
    'rows',
    'multiple',
    'size',
    'accept',
    'for',
    'name',
  ]);

  return commonProps;
}
