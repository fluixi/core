import {
  AsyncScheduler,
  Observable,
  OperatorFunction,
  Subscription,
} from '@awc/reactive';
import { asyncScheduler } from '@awc/reactive/schedulers/async';

/**
 * Buffer closing selector function
 */
export type BufferClosingSelector<T> = () => Observable<any>;

/**
 * Configuration options for buffer
 */
export interface BufferOptions<T> {
  /**
   * Scheduler to use for buffer operations.
   *
   * @default asyncScheduler
   */
  scheduler?: AsyncScheduler;

  /**
   * Maximum buffer size.
   * When buffer reaches this size, it emits immediately.
   *
   * @default Infinity // No size limit
   */
  maxBufferSize?: number;

  /**
   * Whether to emit empty buffers when closing Observable emits.
   *
   * @default true
   */
  emitEmpty?: boolean;

  /**
   * Whether to reset the buffer after emission.
   * If false, continues adding to same buffer.
   *
   * @default true
   */
  resetOnEmit?: boolean;

  /**
   * Time-based buffer duration (in milliseconds).
   * If provided, buffers values for this duration, then emits.
   * Takes precedence over closingSelector.
   *
   * @default undefined // Use closingSelector
   */
  bufferTime?: number;

  /**
   * Whether to start a new buffer immediately after emitting.
   * If false, waits for next source emission to start new buffer.
   *
   * @default true
   */
  restartOnEmit?: boolean;
}

/**
 * Buffers the source Observable values until a closing Observable emits, then emits the buffer.
 *
 * @template T The type of values emitted by the source.
 *
 * @param {Observable<any> | BufferClosingSelector<T>} closingNotifier Observable or function that returns an Observable that signals buffer emission.
 * @param {BufferOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T[]>} An operator function.
 *
 * @example
 * // Buffer by interval
 * source$.pipe(buffer(interval(1000))).subscribe(buffer => {
 *   console.log('Buffer:', buffer); // Emits every second
 * });
 *
 * @example
 * // Buffer by click
 * source$.pipe(buffer(fromEvent(document, 'click'))).subscribe(buffer => {
 *   console.log('Buffer since last click:', buffer);
 * });
 *
 * @example
 * // Time-based buffer
 * source$.pipe(buffer(undefined, { bufferTime: 5000 })).subscribe(buffer => {
 *   console.log('5-second buffer:', buffer);
 * });
 *
 * @performance
 * - Efficient buffer management with size limits
 * - Memory efficient with maxBufferSize
 * - Proper cleanup of closing subscriptions
 * - Support for time-based and event-based buffering
 */
export function buffer<T>(
  closingNotifier?: Observable<any> | BufferClosingSelector<T>,
  options?: BufferOptions<T>
): OperatorFunction<T, T[]> {
  return (source: Observable<T>): Observable<T[]> => {
    return new Observable<T[]>((observer) => {
      const scheduler = options?.scheduler || asyncScheduler;
      const maxBufferSize = options?.maxBufferSize ?? Infinity;
      const emitEmpty = options?.emitEmpty ?? true;
      const resetOnEmit = options?.resetOnEmit ?? true;
      const bufferTime = options?.bufferTime;
      const restartOnEmit = options?.restartOnEmit ?? true;

      let buffer: T[] = [];
      let closingSubscription: Subscription | undefined;
      let timeBufferSubscription: { unsubscribe: () => void } | undefined;
      let sourceCompleted = false;

      /**
       * Emit the current buffer
       */
      const emitBuffer = (): void => {
        if (buffer.length > 0 || emitEmpty) {
          const bufferToEmit = buffer.slice(); // Copy buffer

          scheduler.schedule(() => {
            observer.next(bufferToEmit);
          }, 0);

          if (resetOnEmit) {
            buffer = [];
          }
        }

        // Reset time-based buffer if active
        if (bufferTime !== undefined && timeBufferSubscription) {
          timeBufferSubscription.unsubscribe();
          timeBufferSubscription = undefined;
        }

        // Setup new closing notifier if needed
        if (restartOnEmit && !sourceCompleted) {
          setupClosingNotifier();
        }
      };

      /**
       * Setup closing notifier subscription
       */
      const setupClosingNotifier = (): void => {
        // Clean up previous subscription
        if (closingSubscription) {
          closingSubscription.unsubscribe();
        }

        // Time-based buffering
        if (bufferTime !== undefined) {
          timeBufferSubscription = scheduler.schedule(() => {
            emitBuffer();
          }, bufferTime);
          return;
        }

        // Event-based buffering
        if (closingNotifier) {
          const closing$ =
            typeof closingNotifier === 'function'
              ? closingNotifier()
              : closingNotifier;

          closingSubscription = closing$.subscribe({
            next: () => emitBuffer(),
            error: (err) => observer.error(err),
            complete: () => {
              // Closing observable completed
              if (!sourceCompleted) {
                setupClosingNotifier();
              }
            },
          });
        }
      };

      // Initial setup
      setupClosingNotifier();

      const subscription = source.subscribe({
        next: (value: T) => {
          // Add to buffer
          buffer.push(value);

          // Check buffer size limit
          if (buffer.length >= maxBufferSize) {
            emitBuffer();
          }

          // If restartOnEmit is false and buffer was just started
          if (!restartOnEmit && buffer.length === 1) {
            setupClosingNotifier();
          }
        },
        error: (err: unknown) => {
          // Emit any buffered values before error
          if (buffer.length > 0) {
            emitBuffer();
          }

          observer.error(err);
        },
        complete: () => {
          sourceCompleted = true;

          // Emit any remaining buffered values
          if (buffer.length > 0) {
            emitBuffer();
          }

          // Clean up subscriptions
          if (closingSubscription) {
            closingSubscription.unsubscribe();
          }

          if (timeBufferSubscription) {
            timeBufferSubscription.unsubscribe();
          }

          observer.complete();
        },
      });

      // Cleanup function
      return () => {
        subscription.unsubscribe();

        if (closingSubscription) {
          closingSubscription.unsubscribe();
        }

        if (timeBufferSubscription) {
          timeBufferSubscription.unsubscribe();
        }

        buffer = []; // Clear buffer for garbage collection
      };
    });
  };
}
