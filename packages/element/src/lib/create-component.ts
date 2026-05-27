/**
 * @fileoverview createComponent — wrap any custom element (e.g. Lit) for use
 * in KettleJS JSX with full TypeScript types and proper event binding.
 *
 * Inspired by @lit/react. Key differences:
 *   - `compiler` replaces React as the DOM/runtime adapter
 *   - Complex props (objects/arrays) → DOM property assignment via applyProps
 *   - Custom events use direct addEventListener on the host element (not
 *     document-level delegation) so shadow DOM events always work
 *
 * Usage:
 *   import { AdfAccountsSelector } from '@awc/adf-accounts-selector';
 *   import { createComponent, EventName } from '@awc/element/jsx';
 *
 *   export const AccountsSelector = createComponent({
 *     tagName:      'adf-accounts-selector',
 *     elementClass: AdfAccountsSelector,
 *     compiler:     DOM,
 *     events: {
 *       onChange: 'change' as EventName<AdfAccountsSelectorChangedEvent>,
 *       onLoaded: 'loaded' as EventName<AdfAccountsSelectorLoadedEvent>,
 *     },
 *   });
 *
 *   // Handler is typed as (e: AdfAccountsSelectorChangedEvent) => void:
 *   <AccountsSelector
 *     accounts={act.accounts()}
 *     selected={act.account()?.id}
 *     onChange={(e) => act.select(e.detail)}
 *   />
 */

import { createEffect, onCleanup, type DOM } from '@awc/dom';

// ─── EventName — branded string carrying the event type ──────────────────────

/**
 * A DOM event name branded with its event type T.
 * Cast a plain string to this type in the events map to get typed handlers:
 *
 *   events: { onChange: 'change' as EventName<MyChangeEvent> }
 *
 * The resulting component prop will be typed as:
 *   onChange?: (event: MyChangeEvent) => void
 */
export type EventName<T extends Event = Event> = string & { readonly __eventType: T };

// ─── Element property type helpers ───────────────────────────────────────────

type OwnPropertyKeys<T extends HTMLElement> = {
  [K in keyof T]: K extends keyof HTMLElement
    ? never
    : T[K] extends (...args: any[]) => any
    ? never
    : K;
}[keyof T];

type ElementProps<T extends HTMLElement> = {
  [K in OwnPropertyKeys<T>]?: T[K] | (() => T[K]);
};

// ─── EventsMap and handler type inference ────────────────────────────────────

export type EventsMap = { [key: string]: EventName<any> | string };

/**
 * Extract the concrete Event type from an EventsMap value:
 *   - EventName<MyEvent>  =>  MyEvent
 *   - plain string        =>  CustomEvent
 */
type InferEventType<V> = V extends EventName<infer T> ? T : CustomEvent;

// type EventHandlers<E extends EventsMap> = {
//   [K in keyof E as InferEventType<E[K]> extends never ? never : K ]?: (event: InferEventType<E[K]>) => void;
// };

type EventHandlers<E extends EventsMap> = {
  [K in keyof E as InferEventType<E[K]> extends never ? never : K ]?: (event: InferEventType<E[K]>) => void;
};
// type EventHandlers<E extends EventsMap> = IsEmptyUnion<keyof _EventHandlers<E>> extends true ? {} : _EventHandlers<E>;
// ─── Native DOM event detection ───────────────────────────────────────────────

/** Matches JSX-style event props: onClick, onMouseEnter, onKeyDown, etc. */
const NATIVE_EVENT_RE = /^on([A-Z])/;

/** Convert JSX event prop to DOM event name: onClick → click, onMouseEnter → mouseenter */
function toNativeEvent(prop: string): string {
  return prop.slice(2).toLowerCase();
}

// ─── Standard base attributes ─────────────────────────────────────────────────

type BaseProps = {
  id?:        string | (() => string);
  class?:     string | (() => string);
  className?: string | (() => string);
  style?:     string | Partial<CSSStyleDeclaration>;
  slot?:      string | (() => string);
  ref?:       (el: HTMLElement) => void;
  children?:  any;
  key?:       string | number;

  // ── Native DOM events ────────────────────────────────────────────────────
  onClick?:          (event: MouseEvent) => void;
  onDblClick?:       (event: MouseEvent) => void;
  onMouseDown?:      (event: MouseEvent) => void;
  onMouseUp?:        (event: MouseEvent) => void;
  onMouseEnter?:     (event: MouseEvent) => void;
  onMouseLeave?:     (event: MouseEvent) => void;
  onMouseMove?:      (event: MouseEvent) => void;
  onMouseOver?:      (event: MouseEvent) => void;
  onMouseOut?:       (event: MouseEvent) => void;
  onContextMenu?:    (event: MouseEvent) => void;
  onKeyDown?:        (event: KeyboardEvent) => void;
  onKeyUp?:          (event: KeyboardEvent) => void;
  onKeyPress?:       (event: KeyboardEvent) => void;
  onInput?:          (event: InputEvent) => void;
  onFocus?:          (event: FocusEvent) => void;
  onBlur?:           (event: FocusEvent) => void;
  onSubmit?:         (event: SubmitEvent) => void;
  onReset?:          (event: Event) => void;
  onScroll?:         (event: UIEvent) => void;
  onWheel?:          (event: WheelEvent) => void;
  onPointerDown?:    (event: PointerEvent) => void;
  onPointerUp?:      (event: PointerEvent) => void;
  onPointerMove?:    (event: PointerEvent) => void;
  onPointerEnter?:   (event: PointerEvent) => void;
  onPointerLeave?:   (event: PointerEvent) => void;
  onPointerCancel?:  (event: PointerEvent) => void;
  onTouchStart?:     (event: TouchEvent) => void;
  onTouchEnd?:       (event: TouchEvent) => void;
  onTouchMove?:      (event: TouchEvent) => void;
  onTouchCancel?:    (event: TouchEvent) => void;
  onDragStart?:      (event: DragEvent) => void;
  onDrag?:           (event: DragEvent) => void;
  onDragEnd?:        (event: DragEvent) => void;
  onDragEnter?:      (event: DragEvent) => void;
  onDragLeave?:      (event: DragEvent) => void;
  onDragOver?:       (event: DragEvent) => void;
  onDrop?:           (event: DragEvent) => void;
  onAnimationStart?: (event: AnimationEvent) => void;
  onAnimationEnd?:   (event: AnimationEvent) => void;
  onTransitionEnd?:  (event: TransitionEvent) => void;
  onLoad?:           (event: Event) => void;
  onError?:          (event: Event) => void;

  // Catch-all for any other prop or custom attribute
  [key: string]: any;
};

export type ComponentProps<
  T extends HTMLElement,
  E extends EventsMap = {},
> = ElementProps<T> & EventHandlers<E> & BaseProps;

// ─── createComponent config ───────────────────────────────────────────────────

export interface CreateComponentConfig<
  T extends HTMLElement,
  E extends EventsMap = {},
> {
  tagName:      string;
  elementClass: new (...args: any[]) => T;
  compiler:     DOM;
  events?:      E;
  displayName?: string;
}

// ─── createComponent ─────────────────────────────────────────────────────────

export function createComponent<
  T extends HTMLElement,
  E extends EventsMap = {},
>(config: CreateComponentConfig<T, E>): (props?: ComponentProps<T, E>) => T {
  const { tagName, events = {} as E, displayName, compiler } = config;

  const eventPropKeys = new Set(Object.keys(events));

  function Component(props: ComponentProps<T, E> = {} as ComponentProps<T, E>): T {
   let el;
  //  console.log('createComponent', tagName, displayName, props);
    try{
      el = document.createElement(tagName) as T;
      
    }catch(e){
      throw e
    }

    // ── 1. Bind custom events directly on the element ─────────────────────────
    //
    // We use el.addEventListener — NOT document-level delegation — because:
    //   - Delegation stores element.$$eventname and relies on document bubbling
    //   - Shadow DOM composedPath starts inside the shadow root; the delegation
    //     walk may exit without visiting the host's $$eventname property
    //   - Direct addEventListener on the host always captures events dispatched
    //     by the shadow root, regardless of composed/bubbles (same as @lit/react)
    for (const propKey of eventPropKeys) {
      const domEvent = (events as Record<string, string>)[propKey];
      const raw      = (props as Record<string, any>)[propKey];
      if (raw == null || typeof raw !== 'function') continue;

      if ((raw as any).$SIGNAL === true) {
        console.log('is signal listner', domEvent, raw);
        // Reactive signal wrapping a handler — re-bind when the signal changes
        let current: EventListener | null = null;
        const dispose = createEffect(() => {
          const next = (raw as () => EventListener | null)();
          if (current) el.removeEventListener(domEvent, current);
          current = typeof next === 'function' ? next : null;
          if (current) el.addEventListener(domEvent, current);
        });
        onCleanup(() => {
          dispose();
          if (current) el.removeEventListener(domEvent, current);
        });
      } else {
        // Plain handler — bind once, remove on disposal
        const listener = raw as EventListener;
        if(typeof (el as any).onEvent!=='undefined'){
          (el as any).onEvent(domEvent, listener);
        }else{

          el.addEventListener(domEvent, listener);
        }
        onCleanup(() => el.removeEventListener(domEvent, listener));
      }
    }

    // ── 1b. Bind native DOM events directly on the element ───────────────────
    //
    // Same rationale as custom events above: direct addEventListener is required
    // for shadow DOM elements. applyProps uses document-level delegation ($$event)
    // which doesn't work when composedPath starts inside a shadow root.
    for (const key in props) {
      if (!NATIVE_EVENT_RE.test(key)) continue;
      if (eventPropKeys.has(key)) continue; // already handled as custom event above
      const raw = (props as Record<string, any>)[key];
      if (raw == null || typeof raw !== 'function') continue;

      const domEvent = toNativeEvent(key);

      if ((raw as any).$SIGNAL === true) {
        let current: EventListener | null = null;
        console.log('listner is signal', raw, domEvent)
        const dispose = createEffect(() => {
          const next = (raw as () => EventListener | null)();
          if (current) el.removeEventListener(domEvent, current);
          current = typeof next === 'function' ? next : null;
          if (current) el.addEventListener(domEvent, current);
        });
        onCleanup(() => {
          dispose();
          if (current) el.removeEventListener(domEvent, current);
        });
      } else {
        const listener = raw as EventListener;
                if (typeof (el as any).onEvent !== 'undefined') {
                  (el as any).onEvent(domEvent, listener);
                } else {
                  el.addEventListener(domEvent, listener);
                }
        console.log('listner is', listener, domEvent)
        // el.addEventListener(domEvent, listener);
        // onCleanup(() => el.removeEventListener(domEvent, listener));
      }
    }

    // ── 2. Collect non-event props ────────────────────────────────────────────
    const domProps: Record<string, any> = {};
    for (const key in props) {
      if (key === 'ref' || key === 'children' || key === 'key') continue;
      if (eventPropKeys.has(key)) continue;
      if (NATIVE_EVENT_RE.test(key)) continue; // handled in step 1b
      domProps[key] = (props as Record<string, any>)[key];
    }

    // ── 3. Apply props via the runtime adapter ────────────────────────────────
    //   Functions/signals  → createEffect (reactive)
    //   Objects/arrays     → el[key] = value (DOM property)
    //   Primitives         → setAttribute
    compiler.applyProps(el, domProps);

    // ── 4. ref ────────────────────────────────────────────────────────────────
    if (typeof props.ref === 'function') {
      props.ref(el);
    }
    if (props && props.children !== undefined) {
        const children = compiler.resolveChildren(()=>props.children);
        // compiler.insert(el, children);
        // props.children
        if (Array.isArray(children)) {
          children.forEach((c: any) => {
            compiler.insert(el, c, (typeof c === 'function' ? null : undefined) as any);
          });
        } else {
          compiler.insert(el, children, (typeof children === 'function' ? null : undefined) as any);
        }
    }

    return el;
  }

  (Component as any).displayName = displayName ?? tagName;
  (Component as any).__tagName   = tagName;
  (Component as any).__wcWrapped = true;

  return Component;
}
