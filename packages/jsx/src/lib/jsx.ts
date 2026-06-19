/**
 * @fileoverview React Bridge for Fluixi using @lit/react
 * @module @fluixi/core/react-bridge
 *
 * This module provides React wrappers for Fluixi components, enabling
 * seamless integration with React applications and the React ecosystem.
 */

// Lazy load React to avoid hard dependency
let React: any;

const MINIMAL = {
  createElement: (...args: any[]) => ({
    type: args[0],
    props: args[1] || {},
  }),
  forwardRef: (fn: any) => fn,
  useRef: (initial: any) => ({ current: initial }),
  useEffect: (fn: any, ...args: any[]) => {},
  useState: (initial: any) => [initial, () => {}],
  useReducer: (reducer: any, initial: any) => [initial, () => {}],
  useMemo: (fn: any) => fn(),
  useCallback: (fn: any) => fn,
  isValidElement: () => false,
  Fragment: 'Fragment',
  Component: class {
    props: any;
    state: any = {};
    constructor(props: any) {
      this.props = props;
    }
    setState() {}
    forceUpdate() {}
    render() {
      return null;
    }
  },
};

export async function loadReact(): Promise<typeof MINIMAL> {
  if (!React) {
    try {
      // if (typeof require !== 'undefined') {
      //   React = require('react');
      // } else {
      // }
      React = await import('react');
    } catch (e) {
      console.warn(
        'React not installed. React bridge features will be limited.',
        e
      );
    }
  }
  return React;
}
export function getJSX(): typeof MINIMAL {
  if (!React) {
    return MINIMAL;
  }
  return React;
}

export async function ensureReactInit() {
  if (React) {
    console.warn('React already loaded');
    return React;
  }
  return loadReact()
    .then(() => {
      if (React) {
        console.log('react loaded');
      } else {
        console.log('react not loaded');
      }
    })
    .catch((e) => {
      console.log('error while loading react');
    });
}

/**
 * Component child types
 */
export type ComponentChild =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ComponentChild[]
  | (() => ComponentChild)
  | import('lit').TemplateResult
  | (() => JSX.Element)
  | JSX.Element;
