import {
  isFunction,
  isAddRemoveListenerTarget,
  isDOMEventTarget,
  isNodeEventEmitter,
  isOnOffTarget,
} from '@awc/utils';
import type { DomEventMap, EventTargetLike } from '@awc/utils';
import { Observable } from '../observable.js';

// import { EventEmitter } from 'events';
// import { WebSocketServer } from 'ws';

// const emitter = new EventEmitter();
// const wsServer = new WebSocketServer({ port: 8080 });

// // Listen to Node.js events
// const connection$ = fromEvent(wsServer, 'connection');
// connection$.subscribe(ws => {
//     // Handle WebSocket connection
// });

// // Custom events with multiple arguments
// emitter.emit('data', { id: 1, value: 'test' }, Date.now());
// const data$ = fromEvent(emitter, 'data');
// data$.subscribe(([payload, timestamp]) => {
//     console.log(`Data ${payload.id} received at ${timestamp}`);
// });

/**
 * Creates an Observable that emits events of a specific type coming from the given event target.
 *
 * This function provides multiple overloads to support different event target types and
 * use cases. It automatically infers the correct event type based on the event name and
 * target for excellent TypeScript IntelliSense and type safety.
 *
 * @overload
 * @template T - The type of the event target (must be a standard DOM EventTarget)
 * @template K - The event name (must be a key of DomEventMap)
 * @param {T} target - The event target (e.g., HTMLElement, Window, Document)
 * @param {K} eventName - The name of the event to listen for
 * @param {AddEventListenerOptions} [options] - Options for the event listener
 * @returns {Observable<DomEventMap[K]>} Observable that emits events of the inferred type
 *
 * @overload
 * @template T - The type of the event target (must be a standard DOM EventTarget)
 * @param {T} target - The event target
 * @param {string} eventName - The name of the event to listen for
 * @param {AddEventListenerOptions} [options] - Options for the event listener
 * @returns {Observable<Event>} Observable that emits Event objects
 *
 * @overload
 * @template T - The type of the event target (must extend NodeEventEmitter)
 * @param {T} target - A Node.js EventEmitter or compatible object
 * @param {string} eventName - The name of the event to listen for
 * @param {null} [options] - Options parameter (not used for Node.js emitters)
 * @returns {Observable<any[]>} Observable that emits arrays of event arguments
 *
 * @overload
 * @template T - The type of values emitted by the Observable
 * @template R - The return type of the result selector
 * @param {EventTargetLike} target - Any supported event target
 * @param {string} eventName - The name of the event to listen for
 * @param {(event: T) => R} resultSelector - Function to transform emitted values
 * @returns {Observable<R>} Observable that emits transformed values
 *
 * @example
 * // Basic DOM event with full type inference
 * const clicks$ = fromEvent(document, 'click');
 * clicks$.subscribe((event: MouseEvent) => console.log(event.clientX, event.clientY));
 *
 * @example
 * // With result selector to extract specific data
 * const keyPresses$ = fromEvent(
 *   document,
 *   'keydown',
 *   (event: KeyboardEvent) => ({ key: event.key, code: event.code })
 * );
 *
 * @example
 * // Node.js EventEmitter
 * import { EventEmitter } from 'events';
 * const emitter = new EventEmitter();
 * const data$ = fromEvent(emitter, 'data');
 * data$.subscribe(([data, timestamp]) => console.log(data, timestamp));
 *
 * @example
 * // Custom event target (jQuery style)
 * const $element = {
 *   on: (evt, fn) => element.addEventListener(evt, fn),
 *   off: (evt, fn) => element.removeEventListener(evt, fn)
 * };
 * const custom$ = fromEvent($element, 'custom');
 *
 * @example
 *
 * *Basic Dom Events*
 * // Full type inference - TypeScript knows this is MouseEvent
 * const buttonClicks$ = fromEvent(document.getElementById('myButton'), 'click');
 * buttonClicks$.subscribe(event => {
 *        // event is fully typed as MouseEvent
 *        console.log(`Clicked at (${event.clientX}, ${event.clientY})`);
 * });
 *
 *  // Keyboard events with full type safety
 *  const searchInput = document.getElementById('search') as HTMLInputElement;
 *  const searchInput$ = fromEvent(searchInput, 'input');
 *  searchInput$.subscribe(event => {
 *        // event is InputEvent, target is HTMLInputElement
 *        console.log(`Searching for: ${event.target.value}`);
 * });
 *
 * // Use passive event listener for better scroll performance
 * const scroll$ = fromEvent(window, 'scroll', { passive: true });
 *
 * // Listen only once
 * const firstClick$ = fromEvent(document, 'click', { once: true });
 *
 * @throws {TypeError} If the target doesn't support event listening
 * @throws {Error} If the result selector throws an error
 */
export function fromEvent<T extends EventTarget, K extends keyof DomEventMap>(
  target: T,
  eventName: K,
  options?: AddEventListenerOptions
): Observable<DomEventMap[K]>;

export function fromEvent<T extends EventTarget>(
  target: T,
  eventName: string,
  options?: AddEventListenerOptions
): Observable<Event>;

// export function fromEvent<T extends NodeEventEmitter>(
//     target: T,
//     eventName: string,
//     options?: null
// ): Observable<any[]>;

export function fromEvent<T, R>(
  target: EventTargetLike,
  eventName: string,
  resultSelector?: (event: T) => R
): Observable<R>;

export function fromEvent<T>(
  target: any,
  eventName: string,
  options?: AddEventListenerOptions | ((...args: any[]) => T) | null,
  resultSelector?: (...args: any[]) => T
): Observable<T> {
  // Handle DOM EventTarget with AddEventListenerOptions
  if (
    isDOMEventTarget(target) &&
    !isFunction(options) &&
    !isFunction(resultSelector)
  ) {
    return new Observable((subscriber) => {
      const handler = (event: any) => subscriber.next(event);

      // Add event listener with options
      target.addEventListener(
        eventName,
        handler,
        options as AddEventListenerOptions
      );

      // Return cleanup function
      return () => {
        target.removeEventListener(
          eventName,
          handler,
          options as AddEventListenerOptions
        );
      };
    });
  }

  // Handle result selector (options might be the result selector)
  if (isFunction(options)) {
    resultSelector = options;
    options = undefined;
  }

  // Handle different target types
  if (isDOMEventTarget(target)) {
    // DOM EventTarget with result selector
    return new Observable((subscriber) => {
      const handler = (...args: any[]) => {
        if (resultSelector) {
          try {
            subscriber.next(resultSelector(...args));
          } catch (err) {
            subscriber.error(err);
          }
        } else {
          subscriber.next(args[0]);
        }
      };

      target.addEventListener(
        eventName,
        handler,
        options as AddEventListenerOptions
      );

      return () => {
        target.removeEventListener(
          eventName,
          handler,
          options as AddEventListenerOptions
        );
      };
    });
  } else if (isNodeEventEmitter(target)) {
    // Node.js EventEmitter
    return new Observable((subscriber) => {
      const handler = (...args: any[]) => {
        if (resultSelector) {
          try {
            subscriber.next(resultSelector(...args));
          } catch (err) {
            subscriber.error(err);
          }
        } else {
          subscriber.next(args as any);
        }
      };

      target.addEventListener(eventName, handler);

      return () => {
        target.removeEventListener(eventName, handler);
      };
    });
  } else if (isOnOffTarget(target)) {
    // jQuery-style target with on/off methods
    return new Observable((subscriber) => {
      const handler = (...args: any[]) => {
        if (resultSelector) {
          try {
            subscriber.next(resultSelector(...args));
          } catch (err) {
            subscriber.error(err);
          }
        } else {
          subscriber.next(args[0]);
        }
      };

      target.on(eventName, handler);

      return () => {
        target.off(eventName, handler);
      };
    });
  } else if (isAddRemoveListenerTarget(target)) {
    // Alternative pattern with addListener/removeListener
    return new Observable((subscriber) => {
      const handler = (...args: any[]) => {
        if (resultSelector) {
          try {
            subscriber.next(resultSelector(...args));
          } catch (err) {
            subscriber.error(err);
          }
        } else {
          subscriber.next(args[0]);
        }
      };

      target.addListener(eventName, handler);

      return () => {
        target.removeListener(eventName, handler);
      };
    });
  }

  // If no matching target type found, throw an error
  throw new TypeError(
    'Invalid event target: Target must support event listening via ' +
      'addEventListener, on, or addListener methods.'
  );
}
