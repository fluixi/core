import { $SIGNAL, Accessor, Signal, Store } from '@fluixi/reactive';
import type { TemplateResult } from 'lit';
import { ComponentObserver, Effect, SignalSystem } from './types.js';

class ComponentObserverImpl implements ComponentObserver {
  dependencies: Set<Accessor<any>> = new Set();
  cleanupFunctions: (() => void)[] = [];

  track<T>(getter: () => T): T {
    if (ReactiveDOM.currentObserver === this) {
      const signal = getter as Accessor<T>;
      if ((signal as any)[$SIGNAL]) {
        this.dependencies.add(signal);
      }
    }
    return getter();
  }

  addCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }
}


export const ReactiveDOM = {
  currentObserver: null as ComponentObserver | null,
  batchQueue: new Set<() => void>(),
  isBatching: false,
  signalSystem: null as SignalSystem | null,

  init(signalSystem: SignalSystem): void {
    this.signalSystem = signalSystem;
  },

  createElement(
    tag: any,
    props: any,
    key?: string
  ): Node | Node[] | null | TemplateResult {
    // console.log('creating elemnt', { tag, props });
    if (typeof tag === 'function') {
      return this.createComponent(tag, props);
    }
    const { children, ...rest } = props;

    // const element = buildElementTemplate(tag, rest, children);
    const element = {} as any;
    const prevObserver = this.currentObserver;
    const observer = new ComponentObserverImpl();
    try {
      this.currentObserver = observer;
      this.attachObserver(element, observer);
      // const element = document.createElement(tag);

      // if (props) {
      //   this.applyProps(element, props);
      // }

      return element;
    } finally {
      this.currentObserver = prevObserver;
    }
  },

  createComponent(Component: Function, props: any): Node | Node[] | null {
    const prevObserver = this.currentObserver;
    const observer = new ComponentObserverImpl();

    this.currentObserver = observer;

    try {
      const result = Component(props);

      if (result instanceof Node) {
        this.attachObserver(result, observer);
        return result;
      }

      if (Array.isArray(result)) {
        const fragment = document.createDocumentFragment();
        result.forEach((node) => {
          if (node instanceof Node) {
            fragment.appendChild(node);
            this.attachObserver(node, observer);
          }
        });
        return fragment;
      }

      return result;
    } finally {
      this.currentObserver = prevObserver;
    }
  },

  applyProps(element: HTMLElement, props: any): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue;
      if (key === 'ref') {
        this.handleRef(value, element);
        continue;
      }
      if (key === 'key') continue;

      this.applyProp(element, key, value);
    }

    if (props.children !== undefined) {
      this.appendChildren(element, props.children);
    }
  },

  applyProp(element: HTMLElement, key: string, value: any): void {
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
      return;
    }

    if (key === 'style' && typeof value === 'object') {
      this.applyStyle(element, value);
      return;
    }

    if (key === 'class' || key === 'className') {
      this.applyClassName(element, value);
      return;
    }

    if (typeof value === 'boolean') {
      if (value) {
        element.setAttribute(key, '');
      } else {
        element.removeAttribute(key);
      }
      return;
    }

    if (typeof value === 'function') {
      this.createReactiveAttribute(element, key, value);
      return;
    }

    element.setAttribute(key, value);
  },

  applyStyle(element: HTMLElement, style: any): void {
    if (typeof style === 'function') {
      this.createReactiveStyle(element, style);
    } else {
      Object.assign(element.style, style);
    }
  },

  applyClassName(element: HTMLElement, className: any): void {
    if (typeof className === 'function') {
      this.createReactiveClassName(element, className);
    } else {
      element.className = className || '';
    }
  },

  createReactiveAttribute(
    element: HTMLElement,
    key: string,
    getter: () => any
  ): void {
    const initialValue = getter();
    this.applyProp(element, key, initialValue);

    if (this.isReactive(getter)) {
      this.createEffect(() => {
        const value = getter();
        this.applyProp(element, key, value);
      });
    }
  },

  createReactiveStyle(element: HTMLElement, getter: () => any): void {
    const initialStyle = getter();
    Object.assign(element.style, initialStyle);

    if (this.isReactive(getter)) {
      this.createEffect(() => {
        const style = getter();
        Object.assign(element.style, style);
      });
    }
  },

  createReactiveClassName(element: HTMLElement, getter: () => string): void {
    const initialClassName = getter();
    element.className = initialClassName || '';

    if (this.isReactive(getter)) {
      this.createEffect(() => {
        const className = getter();
        element.className = className || '';
      });
    }
  },

  appendChildren(parent: HTMLElement, children: any): void {
    if (Array.isArray(children)) {
      for (const child of children) {
        this.appendChild(parent, child);
      }
    } else {
      this.appendChild(parent, children);
    }
  },

  appendChild(parent: HTMLElement, child: any): void {
    if (child == null || child === false || child === true) {
      return;
    }

    if (child instanceof Node) {
      parent.appendChild(child);
      return;
    }

    if (typeof child === 'function') {
      const node = this.createReactiveNode(child);
      parent.appendChild(node);
      return;
    }

    parent.appendChild(document.createTextNode(String(child)));
  },

  createReactiveNode(getter: () => any): Text {
    const textNode = document.createTextNode('');

    const update = () => {
      const value = getter();
      textNode.nodeValue = value != null ? String(value) : '';
    };

    update();

    if (this.isReactive(getter)) {
      this.createEffect(update);
    }

    return textNode;
  },

  handleRef(ref: any, element: HTMLElement): void {
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && typeof ref === 'object') {
      (ref as any).current = element;
    }
  },

  isReactive(value: any): boolean {
    if (typeof value !== 'function') return false;

    if (value.__isSignal || (value as any).__isStore) return true;

    if (this.signalSystem?.isReactive?.(value)) return true;

    return false;
  },

  createEffect(fn: () => void): Effect {
    if (this.signalSystem?.createEffect) {
      return this.signalSystem.createEffect(fn);
    }

    fn();
    return { dispose: () => {} } as Effect;
  },

  batch(fn: () => void): void {
    if (this.isBatching) {
      fn();
      return;
    }

    this.isBatching = true;
    try {
      fn();
      this.flushBatch();
    } finally {
      this.isBatching = false;
    }
  },

  flushBatch(): void {
    for (const fn of this.batchQueue) {
      fn();
    }
    this.batchQueue.clear();
  },

  scheduleUpdate(fn: () => void): void {
    if (this.isBatching) {
      this.batchQueue.add(fn);
    } else {
      fn();
    }
  },

  attachObserver(
    element: Node | TemplateResult,
    observer: ComponentObserver
  ): void {
    if (!observer) return;

    if (!(element as any).__cleanup) {
      (element as any).__cleanup = [];
    }

    observer.cleanupFunctions.forEach((fn) => {
      (element as any).__cleanup.push(fn);
    });
  },

  cleanupElement(element: Node): void {
    if ((element as any).__cleanup) {
      (element as any).__cleanup.forEach((fn: () => void) => fn());
      (element as any).__cleanup = [];
    }
  },
};
