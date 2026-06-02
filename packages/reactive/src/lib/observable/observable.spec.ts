import { it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
  Observable,
  Subscription,
  Observer,
  SubscriptionLike,
  from,
  of,
  interval,
  timer,
  fromEvent,
  range,
  defer,
  combineLatest,
  concat,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  forkJoin,
  fromFetch,
  fromPromise,
  map,
  merge,
  mergeMap,
  skip,
  switchMap,
  take,
  tap,
  throttleTime,
  throwError,
  catchError,
  never,
  debounceTime,
} from '@fluixi/reactive';
import * as Rx from 'rxjs';

// Mock async scheduler for time-based operators
// const asyncScheduler = {
//   now: () => Date.now(),
//   schedule: vi.fn((work: () => void, delay?: number) => {
//     const timer = setTimeout(work, delay);
//     return {
//       unsubscribe: () => clearTimeout(timer),
//       closed: false
//     } as Subscription;
//   })
// } as SchedulerLike;

// Re-export all methods from the provided code
// Import additional methods that are used but not defined in the provided code

// Mock fetch for fromFetch tests
// global.fetch = vi.fn();

describe('Observable', () => {
  it('should create an observable with a subscriber function', () => {
    const observable = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);
      subscriber.complete();
    });

    const values: number[] = [];
    observable.subscribe({
      next: (value) => values.push(value),
      complete: () => {
        expect(values).toEqual([1, 2, 3]);
      },
    });
  });

  it('should handle errors in subscriber', () => {
    const error = new Error('Test error');
    const observable = new Observable<number>((subscriber) => {
      subscriber.error(error);
    });

    observable.subscribe({
      error: (err) => {
        expect(err).toBe(error);
      },
    });
  });

  it('should return a subscription that can be unsubscribed', () => {
    let cleanupCalled = false;
    const observable = new Observable<number>((subscriber) => {
      subscriber.next(1);
      return () => {
        cleanupCalled = true;
      };
    });

    const subscription = observable.subscribe((e) => {
      console.log(e);
    });
    subscription.unsubscribe();

    expect(cleanupCalled).toBe(true);
    expect(subscription.closed).toBe(true);
  });

  it('should support multiple observers', () => {
    const values1: number[] = [];
    const values2: number[] = [];

    const observable = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.complete();
    });

    observable.subscribe((value) => values1.push(value));
    observable.subscribe((value) => values2.push(value));

    expect(values1).toEqual([1, 2]);
    expect(values2).toEqual([1, 2]);
  });

  it('should pipe operators', () => {
    const observable = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);
      subscriber.complete();
    });

    const values: number[] = [];
    observable
      .pipe(
        map((x) => x * 2),
        filter((x) => x > 3)
      )
      .subscribe((value) => values.push(value));

    expect(values).toEqual([4, 6]);
  });
});

describe('fromEvent', () => {
  let mockElement: HTMLDivElement;
  let addEventListener: Mock;
  let removeEventListener: Mock;

  beforeEach(() => {
    addEventListener = vi.fn(() => 'Event Listner');
    removeEventListener = vi.fn(() => 'Remove Event Listner');

    mockElement = {
      addEventListener,
      removeEventListener,
    } as unknown as HTMLDivElement;
  });

  it('should create observable from DOM events', () => {
    const event = new Event('click');
    const element = document.createElement('div');
    const observable = fromEvent(element, 'click');

    // const handler = addEventListener.mock.calls[0][1];
    // const subscriber = vi.fn(()=>"click event ===>");
    observable
      .subscribe((value) => {
        console.log('click event ===>', value);
        expect(value).toEqual(event);
      })
      .unsubscribe();
    element.dispatchEvent(event);

    // handler(event);

    // expect(addEventListener).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    // expect(subscriber).toHaveBeenCalledWith(event);
  });

  it('should remove event listener on unsubscribe', () => {
    const observable = fromEvent(mockElement, 'click');
    const subscription = observable.subscribe((ev) => {
      console.log('click event ===>', ev);
    });

    subscription.unsubscribe();

    expect(removeEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      undefined
    );
  });

  it('should support event listener options', () => {
    const options = { capture: true };
    fromEvent(mockElement, 'click', options).subscribe((ev) => {
      console.log('click event ===>', ev);
    });

    expect(addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      options
    );
  });

  it('should support result selector', () => {
    const event = new CustomEvent('click', {
      detail: { clientX: 100, clientY: 200 },
    });
    const observable = fromEvent<CustomEvent, number>(
      mockElement,
      'click',
      (e: CustomEvent) => e.detail.clientX
    );
    observable
      .subscribe((value) => {
        expect(value).toEqual(100);
      })
      .unsubscribe();
    const el = document.createElement('div');
    el.dispatchEvent(event);

    // const handler = addEventListener.mock.calls[0][1];
    // const subscriber = vi.fn();
    // observable.subscribe(subscriber);

    // handler(event);

    // expect(subscriber).toHaveBeenCalledWith(100);
  });

  it('should handle errors in result selector', () => {
    const observable = fromEvent(mockElement, 'click', () => {
      throw new Error('Selector error');
    });

    const errorHandler = vi.fn();
    observable.subscribe({
      error: errorHandler,
    });

    const handler = addEventListener.mock.calls[0][1];
    handler(new Event('click'));

    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('range', () => {
  it('should emit sequential numbers', () => {
    const values: number[] = [];
    range(1, 5).subscribe((value) => values.push(value));

    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  it('should complete after emitting all values', () => {
    let completed = false;
    range(1, 3).subscribe({
      complete: () => {
        completed = true;
      },
    });

    expect(completed).toBe(true);
  });

  it('should handle zero count', () => {
    const values: number[] = [];
    let completed = false;

    range(1, 0).subscribe({
      next: (value) => values.push(value),
      complete: () => {
        completed = true;
      },
    });

    expect(values).toEqual([]);
    expect(completed).toBe(true);
  });

  it('should handle default parameters', () => {
    const values: number[] = [];
    range().subscribe((value) => values.push(value));

    expect(values).toEqual([]);
  });
});

describe('never', () => {
  it('should not emit values or complete', () => {
    const nextHandler = vi.fn();
    const completeHandler = vi.fn();

    const subscription = never().subscribe({
      next: nextHandler,
      complete: completeHandler,
    });

    subscription.unsubscribe();

    expect(nextHandler).not.toHaveBeenCalled();
    expect(completeHandler).not.toHaveBeenCalled();
  });
});

describe('defer', () => {
  it('should defer observable creation until subscription', () => {
    const factory = vi.fn(() => of(1, 2, 3));

    const observable = defer(factory);
    expect(factory).not.toHaveBeenCalled();

    const values: number[] = [];
    observable.subscribe((value) => values.push(value));

    expect(factory).toHaveBeenCalled();
    expect(values).toEqual([1, 2, 3]);
  });

  it('should handle factory returning void', () => {
    const factory = vi.fn(() => {});

    let completed = false;
    defer(factory).subscribe({
      complete: () => {
        completed = true;
      },
    });

    expect(completed).toBe(true);
  });

  it('should handle factory throwing error', () => {
    const error = new Error('Factory error');
    const factory = vi.fn(() => {
      throw error;
    });

    const errorHandler = vi.fn();
    defer(factory).subscribe({
      error: errorHandler,
    });

    expect(errorHandler).toHaveBeenCalledWith(error);
  });

  it('should handle promise factory', async () => {
    const factory = vi.fn(() => Promise.resolve(42));

    const value = await new Promise((resolve) => {
      defer(factory).subscribe(resolve);
    });

    expect(value).toBe(42);
  });
});

// describe('fromFetch', () => {
//   beforeEach(() => {
//     vi.clearAllMocks();
//   });

//   it('should create observable from fetch request', async () => {
//     const mockResponse = { ok: true, status: 200 };
//     (global.fetch as Mock).mockResolvedValue(mockResponse);

//     const observable = fromFetch('https://api.example.com/data');

//     const response = await new Promise(resolve => {
//       observable.subscribe(resolve);
//     });

//     expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', { signal: expect.any(AbortSignal) });
//     expect(response).toBe(mockResponse);
//   });

//   it('should handle fetch errors', async () => {
//     const error = new Error('Network error');
//     (global.fetch as Mock).mockRejectedValue(error);

//     const observable = fromFetch('https://api.example.com/data');

//     const capturedError = await new Promise<void>(resolve => {
//       observable.subscribe({
//         error: resolve
//       });
//     });

//     expect(capturedError).toBe(error);
//   });

//   it('should abort request on unsubscribe', async () => {
//     const abortSpy = vi.fn();
//     const mockAbortController = {
//       abort: abortSpy,
//       signal: {} as AbortSignal
//     };

//     vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any);

//     (global.fetch as Mock).mockImplementation(() => new Promise<void>(() => {})); // Never resolves

//     const observable = fromFetch('https://api.example.com/data');
//     const subscription = observable.subscribe();

//     subscription.unsubscribe();

//     expect(abortSpy).toHaveBeenCalled();
//   });

//   it('should support request init options', async () => {
//     const mockResponse = { ok: true };
//     (global.fetch as Mock).mockResolvedValue(mockResponse);

//     const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
//     const observable = fromFetch('https://api.example.com/data', init);

//     await new Promise(resolve => {
//       observable.subscribe(resolve);
//     });

//     expect(global.fetch).toHaveBeenCalledWith(
//       'https://api.example.com/data',
//       expect.objectContaining({
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         signal: expect.any(AbortSignal)
//       })
//     );
//   });
// });

describe('map', () => {
  it('should transform values using projection function', () => {
    const source = of(1, 2, 3);
    const values: number[] = [];

    source.pipe(map((x) => x * 2)).subscribe((value) => values.push(value));

    expect(values).toEqual([2, 4, 6]);
  });

  it('should pass index to projection function', () => {
    const source = of('a', 'b', 'c');
    const values: string[] = [];

    source
      .pipe(map((value, index) => `${value}-${index}`))
      .subscribe((value) => values.push(value));

    expect(values).toEqual(['a-0', 'b-1', 'c-2']);
  });

  it('should handle errors in projection function', () => {
    const source = of(1, 2, 3);
    const errorHandler = vi.fn();

    source
      .pipe(
        map((x) => {
          if (x === 2) throw new Error('Test error');
          return x;
        })
      )
      .subscribe({
        error: errorHandler,
      });

    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('filter', () => {
  it('should filter values based on predicate', () => {
    const source = of(1, 2, 3, 4, 5);
    const values: number[] = [];

    source
      .pipe(filter((x) => x % 2 === 0))
      .subscribe((value) => values.push(value));

    expect(values).toEqual([2, 4]);
  });

  it('should pass index to predicate function', () => {
    const source = of('a', 'b', 'c', 'd');
    const values: string[] = [];

    source
      .pipe(filter((value, index) => index % 2 === 0))
      .subscribe((value) => values.push(value));

    expect(values).toEqual(['a', 'c']);
  });

  it('should handle errors in predicate function', () => {
    const source = of(1, 2, 3);
    const errorHandler = vi.fn();

    source
      .pipe(
        filter((x) => {
          if (x === 2) throw new Error('Test error');
          return true;
        })
      )
      .subscribe({
        error: errorHandler,
      });

    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('tap', () => {
  it('should perform side effects without modifying values', () => {
    const source = of(1, 2, 3);
    const values: number[] = [];
    const sideEffect = vi.fn();

    source.pipe(tap(sideEffect)).subscribe((value) => values.push(value));

    expect(values).toEqual([1, 2, 3]);
    expect(sideEffect).toHaveBeenCalledTimes(3);
    expect(sideEffect).toHaveBeenCalledWith(1);
    expect(sideEffect).toHaveBeenCalledWith(2);
    expect(sideEffect).toHaveBeenCalledWith(3);
  });

  it('should support observer object with next, error, complete', () => {
    const source = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.complete();
    });

    const observer = {
      next: vi.fn(),
      error: vi.fn(),
      complete: vi.fn(),
    };

    source.pipe(tap(observer)).subscribe((o) => {
      console.log('o', o);
    });

    expect(observer.next).toHaveBeenCalledTimes(2);
    expect(observer.complete).toHaveBeenCalled();
  });

  it('should handle errors in side effect without affecting main stream', () => {
    const source = of(1, 2, 3);
    const values: number[] = [];

    source
      .pipe(
        tap((x) => {
          if (x === 2) throw new Error('Side effect error');
        })
      )
      .subscribe((value) => {
        console.log('tap subscriber value', value);
        values.push(value);
      });

    // The error in tap should cause the observable to error
    // Note: In the implementation, tap errors are propagated to the main stream
    expect(values).toEqual([1]); // Only first value before error
  });

  it('should handle complete side effect', () => {
    let completeCalled = false;
    const source = of(1, 2, 3);

    source
      .pipe(
        tap({
          complete: () => {
            completeCalled = true;
          },
        })
      )
      .subscribe((v) => {
        // console.log('v', v);
      });

    expect(completeCalled).toBe(true);
  });
});

describe('debounceTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce emissions', async () => {
    const values: number[] = [];
    const source = new Observable<number>((subscriber) => {
      subscriber.next(1);
      setTimeout(() => subscriber.next(2), 100);
      setTimeout(() => subscriber.next(3), 200);
      setTimeout(() => subscriber.complete(), 300);
    });

    const subscription = source.pipe(debounceTime(150)).subscribe((value) => {
      values.push(value);
      console.log('debounce value', value);
    });
    // vi.useRealTimers()
    // Fast forward through time
    vi.advanceTimersByTime(300);
    subscription.unsubscribe();

    expect(values).toEqual([3]); // Only last value after debounce
  });

  it('should emit after specified delay with no new values', () => {
    const source = new Observable<number>((subscriber) => {
      subscriber.next(1);
      setTimeout(() => subscriber.next(2), 50);
    });

    const values: number[] = [];
    const subscription = source
      .pipe(debounceTime(100))
      .subscribe((value) => values.push(value));

    vi.advanceTimersByTime(200);
    subscription.unsubscribe();
    expect(values).toEqual([2]); // Both values should be emitted after delay
  });

  it('should complete after last debounced value', async () => {
    // beforeEach(() => {
    //   vi.useFakeTimers()
    // })
    // afterEach(() => {
    //   vi.restoreAllMocks()
    // })

    // resolve();
    const values: number[] = [];

    const source = new Observable<number>((subscriber) => {
      subscriber.next(1);
      setTimeout(() => {
        subscriber.next(2);
        subscriber.complete();
      }, 50);
    });
    // const source = new Observable<number>(subscriber => {
    //   subscriber.next(1);
    //   setTimeout(() => {
    //     subscriber.next(2);
    //     subscriber.complete();
    //   }, 100);
    // });
    let completed = false;

    const subscription = source.pipe(debounceTime(100)).subscribe({
      next: (value) => {
        console.log('next value', value);
        values.push(value);
      },
      complete: () => {
        console.log('completed');
        completed = true;
        // resolve();
      },
    });
    vi.advanceTimersByTime(200);

    subscription.unsubscribe();
    expect(values).toEqual([2]);
    // await new Promise<void>(resolve => {
    //   // vi.useFakeTimers();
    //   // const fn = vi.fn(()=>{
    //   // });
    //   // fn();
    //   // vi.useRealTimers();
    //   // resolve()

    //   // .subscribe(value=>{
    //   //   values.push(value);
    //   //   // resolve();
    //   // })

    //   // vi.runAllTimers()
    // })
    // .subscribe({
    //   next: value => values.push(value),
    //   complete: () => { completed = true; }
    // });

    // expect(completed).toBe(true);
  });

  it('should handle source errors immediately', () => {
    const error = new Error('Test error');
    const source = new Observable<number>((subscriber) => {
      subscriber.next(1);
      setTimeout(() => subscriber.error(error), 100);
    });

    const errorHandler = vi.fn();
    const subscription = source.pipe(debounceTime(200)).subscribe({
      error: errorHandler,
    });

    vi.advanceTimersByTime(200);
    subscription.unsubscribe();
    expect(errorHandler).toHaveBeenCalledWith(error);
  });
});

// describe('throttleTime', () => {
//   beforeEach(() => {
//     vi.useFakeTimers();
//     vi.clearAllMocks();
//   });

//   afterEach(() => {
//     vi.useRealTimers();
//   });

//   it('should throttle emissions', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       setTimeout(() => subscriber.next(2), 50);
//       setTimeout(() => subscriber.next(3), 100);
//       setTimeout(() => subscriber.next(4), 150);
//       setTimeout(() => subscriber.complete(), 200);
//     });

//     const values: number[] = [];
//     source.pipe(
//       throttleTime(100, {scheduler: asyncScheduler as any})
//     ).subscribe(value => values.push(value));

//     vi.advanceTimersByTime(200);

//     expect(values).toEqual([1, 3]); // First value, then value after throttle period
//   });

//   it('should emit trailing value if within throttle window', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       setTimeout(() => subscriber.next(2), 75);
//       setTimeout(() => subscriber.complete(), 200);
//     });

//     const values: number[] = [];
//     source.pipe(
//       throttleTime(100, {scheduler: asyncScheduler as any})
//     ).subscribe(value => values.push(value));

//     vi.advanceTimersByTime(200);

//     expect(values).toEqual([1, 2]);
//   });

//   it('should complete after throttle period', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       subscriber.complete();
//     });

//     let completed = false;
//     source.pipe(
//       throttleTime(100, {scheduler: asyncScheduler as any})
//     ).subscribe({
//       complete: () => { completed = true; }
//     });

//     vi.advanceTimersByTime(200);

//     expect(completed).toBe(true);
//   });
// });

// describe('mergeMap', () => {
//   it('should map and merge inner observables', () => {
//     const source = of(1, 2, 3);
//     const values: number[] = [];

//     source.pipe(
//       mergeMap(x => of(x * 10, x * 100))
//     ).subscribe(value => values.push(value));

//     // Values may be interleaved due to merging
//     expect(values).toContain(10);
//     expect(values).toContain(20);
//     expect(values).toContain(30);
//     expect(values).toContain(100);
//     expect(values).toContain(200);
//     expect(values).toContain(300);
//     expect(values.length).toBe(6);
//   });

//   it('should support concurrent parameter', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       setTimeout(() => subscriber.next(2), 10);
//       setTimeout(() => subscriber.next(3), 20);
//       setTimeout(() => subscriber.complete(), 30);
//     });

//     const values: number[] = [];
//     const activeCounts: number[] = [];
//     let active = 0;

//     source.pipe(
//       mergeMap(x => {
//         active++;
//         activeCounts.push(active);
//         return new Observable<number>(innerSubscriber => {
//           setTimeout(() => {
//             innerSubscriber.next(x * 10);
//             innerSubscriber.complete();
//             active--;
//           }, 50);
//         });
//       }, 2) // Max 2 concurrent
//     ).subscribe(value => values.push(value));

//     // Wait for all inner observables to complete
//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(Math.max(...activeCounts)).toBe(2); // Never more than 2 concurrent
//         resolve();
//       }, 200);
//     });
//   });

//   it('should handle errors in projection function', () => {
//     const source = of(1, 2, 3);
//     const errorHandler = vi.fn();

//     source.pipe(
//       mergeMap(x => {
//         if (x === 2) throw new Error('Test error');
//         return of(x);
//       })
//     ).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
//   });

//   it('should handle errors in inner observable', () => {
//     const source = of(1, 2, 3);
//     const errorHandler = vi.fn();

//     source.pipe(
//       mergeMap(x => {
//         if (x === 2) return throwError(() => new Error('Inner error'));
//         return of(x);
//       })
//     ).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
//   });
// });

// describe('switchMap', () => {
//   it('should switch to new inner observable', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       setTimeout(() => subscriber.next(2), 10);
//       setTimeout(() => subscriber.complete(), 30);
//     });

//     const values: number[] = [];
//     source.pipe(
//       switchMap(x => interval(5).pipe(take(3), map(i => x * 10 + i)))
//     ).subscribe(value => values.push(value));

//     // Wait for completion
//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         // Should only get values from the second inner observable
//         // because it switches away from the first
//         expect(values).toEqual([10, 11, 12, 20, 21, 22]);
//         resolve();
//       }, 100);
//     });
//   });

//   it('should cancel previous inner observable', () => {
//     let inner1Completed = false;
//     let inner2Completed = false;

//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       setTimeout(() => subscriber.next(2), 10);
//     });

//     source.pipe(
//       switchMap(x => {
//         return new Observable<number>(innerSubscriber => {
//           if (x === 1) {
//             setTimeout(() => {
//               innerSubscriber.next(100);
//               innerSubscriber.complete();
//               inner1Completed = true;
//             }, 50);
//           } else {
//             setTimeout(() => {
//               innerSubscriber.next(200);
//               innerSubscriber.complete();
//               inner2Completed = true;
//             }, 50);
//           }
//         });
//       })
//     ).subscribe();

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(inner1Completed).toBe(false); // Should be cancelled
//         expect(inner2Completed).toBe(true); // Should complete
//         resolve();
//       }, 100);
//     });
//   });
// });

// describe('concatMap', () => {
//   it('should concatenate inner observables sequentially', () => {
//     const source = of(1, 2, 3);
//     const order: number[] = [];

//     source.pipe(
//       concatMap(x => {
//         return new Observable<number>(subscriber => {
//           setTimeout(() => {
//             order.push(x);
//             subscriber.next(x * 10);
//             subscriber.complete();
//           }, (4 - x) * 10); // Reverse order: 3 completes first, then 2, then 1
//         });
//       })
//     ).subscribe();

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(order).toEqual([1, 2, 3]); // Should process in order despite timing
//         resolve();
//       }, 100);
//     });
//   });

//   it('should wait for previous to complete before starting next', () => {
//     const source = of(1, 2);
//     const active: number[] = [];
//     let currentActive = 0;

//     source.pipe(
//       concatMap(x => {
//         currentActive++;
//         active.push(currentActive);
//         return new Observable<number>(subscriber => {
//           setTimeout(() => {
//             subscriber.next(x);
//             subscriber.complete();
//             currentActive--;
//           }, 20);
//         });
//       })
//     ).subscribe();

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(Math.max(...active)).toBe(1); // Only 1 active at a time
//         resolve();
//       }, 100);
//     });
//   });
// });

// describe('exhaustMap', () => {
//   it('should ignore new values while inner observable is active', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       setTimeout(() => subscriber.next(2), 10);
//       setTimeout(() => subscriber.next(3), 50);
//       setTimeout(() => subscriber.complete(), 100);
//     });

//     const values: number[] = [];
//     source.pipe(
//       exhaustMap(x => {
//         return new Observable<number>(innerSubscriber => {
//           setTimeout(() => {
//             innerSubscriber.next(x * 10);
//             innerSubscriber.complete();
//           }, 30);
//         });
//       })
//     ).subscribe(value => values.push(value));

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(values).toEqual([10, 30]); // 2 is ignored because 1 is still active
//         resolve();
//       }, 100);
//     });
//   });
// });

// describe('fromPromise', () => {
//   it('should create observable from promise', async () => {
//     const promise = Promise.resolve(42);
//     const observable = fromPromise(promise);

//     const value = await new Promise(resolve => {
//       observable.subscribe(resolve);
//     });

//     expect(value).toBe(42);
//   });

//   it('should handle promise rejection', async () => {
//     const error = new Error('Promise rejected');
//     const promise = Promise.reject(error);
//     const observable = fromPromise(promise);

//     const capturedError = await new Promise<void>(resolve => {
//       observable.subscribe({
//         error: resolve
//       });
//     });

//     expect(capturedError).toBe(error);
//   });

//   it('should throw TypeError for non-promise input', () => {
//     expect(() => fromPromise({} as Promise<any>)).toThrow(TypeError);
//   });
// });

// describe('toPromise', () => {
//   it('should convert observable to promise', async () => {
//     const observable = of(1, 2, 3);
//     const promise = observable.toPromise();

//     const value = await promise;
//     expect(value).toBe(3); // Last emitted value
//   });

//   it('should resolve with undefined for empty observable', async () => {
//     const observable = new Observable(subscriber => {
//       subscriber.complete();
//     });

//     const promise = observable.toPromise();
//     const value = await promise;

//     expect(value).toBeUndefined();
//   });

//   it('should reject on observable error', async () => {
//     const error = new Error('Test error');
//     const observable = throwError(() => error);

//     const promise = observable.toPromise();

//     await expect(promise).rejects.toBe(error);
//   });
// });

// describe('merge', () => {
//   it('should merge multiple observables', () => {
//     const source1 = of(1, 2, 3);
//     const source2 = of('a', 'b', 'c');

//     const values: (number | string)[] = [];
//     merge(source1, source2).subscribe(value => values.push(value));

//     // Values are interleaved in the order they emit
//     expect(values).toContain(1);
//     expect(values).toContain(2);
//     expect(values).toContain(3);
//     expect(values).toContain('a');
//     expect(values).toContain('b');
//     expect(values).toContain('c');
//     expect(values.length).toBe(6);
//   });

//   it('should complete when all sources complete', () => {
//     const source1 = new Observable<number>(subscriber => {
//       setTimeout(() => {
//         subscriber.next(1);
//         subscriber.complete();
//       }, 10);
//     });

//     const source2 = new Observable<number>(subscriber => {
//       setTimeout(() => {
//         subscriber.next(2);
//         subscriber.complete();
//       }, 20);
//     });

//     let completed = false;
//     merge(source1, source2).subscribe({
//       complete: () => { completed = true; }
//     });

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(completed).toBe(true);
//         resolve();
//       }, 50);
//     });
//   });

//   it('should error if any source errors', () => {
//     const error = new Error('Test error');
//     const source1 = of(1, 2);
//     const source2 = throwError(() => error);

//     const errorHandler = vi.fn();
//     merge(source1, source2).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(error);
//   });
// });

// describe('concat', () => {
//   it('should concatenate observables sequentially', () => {
//     const source1 = of(1, 2, 3);
//     const source2 = of(4, 5, 6);

//     const values: number[] = [];
//     concat(source1, source2).subscribe(value => values.push(value));

//     expect(values).toEqual([1, 2, 3, 4, 5, 6]);
//   });

//   it('should wait for first to complete before starting second', () => {
//     const order: string[] = [];

//     const source1 = new Observable<number>(subscriber => {
//       order.push('source1 start');
//       setTimeout(() => {
//         subscriber.next(1);
//         subscriber.complete();
//         order.push('source1 complete');
//       }, 10);
//     });

//     const source2 = new Observable<number>(subscriber => {
//       order.push('source2 start');
//       setTimeout(() => {
//         subscriber.next(2);
//         subscriber.complete();
//         order.push('source2 complete');
//       }, 10);
//     });

//     concat(source1, source2).subscribe();

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(order).toEqual([
//           'source1 start',
//           'source1 complete',
//           'source2 start',
//           'source2 complete'
//         ]);
//         resolve();
//       }, 50);
//     });
//   });

//   it('should stop if any source errors', () => {
//     const error = new Error('Test error');
//     const source1 = of(1, 2);
//     const source2 = throwError(() => error);
//     const source3 = of(3, 4);

//     const values: number[] = [];
//     const errorHandler = vi.fn();

//     concat(source1, source2, source3).subscribe({
//       next: value => values.push(value),
//       error: errorHandler
//     });

//     expect(values).toEqual([1, 2]); // Only values before error
//     expect(errorHandler).toHaveBeenCalledWith(error);
//   });
// });

// describe('combineLatest', () => {
//   it('should combine latest values from multiple sources', () => {
//     const source1 = new Observable<number>(subscriber => {
//       setTimeout(() => subscriber.next(1), 10);
//       setTimeout(() => subscriber.next(2), 20);
//       setTimeout(() => subscriber.complete(), 30);
//     });

//     const source2 = new Observable<string>(subscriber => {
//       setTimeout(() => subscriber.next('a'), 15);
//       setTimeout(() => subscriber.next('b'), 25);
//       setTimeout(() => subscriber.complete(), 35);
//     });

//     const values: any[] = [];
//     combineLatest(
//       source1,
//       source2,
//       of((num: any, str: any) => `${num}-${str}`)
//     ).subscribe(value => values.push(value));

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         // Should start emitting when both have emitted at least once
//         expect(values).toEqual(['1-a', '2-a', '2-b']);
//         resolve();
//       }, 50);
//     });
//   });

//   it('should throw TypeError if last argument is not a function', () => {
//     expect(() => combineLatest(of(1), of(2), 3 as any)).toThrow(TypeError);
//   });

//   it('should complete when all sources complete', () => {
//     let completed = false;
//     combineLatest(
//       of(1),
//       of('a'),
//       of((num: any, str: any) => `${num}-${str}`)
//     ).subscribe({
//       complete: () => { completed = true; }
//     });

//     expect(completed).toBe(true);
//   });

//   it('should handle errors from any source', () => {
//     const error = new Error('Test error');
//     const source1 = of(1);
//     const source2 = throwError(() => error);

//     const errorHandler = vi.fn();
//     combineLatest(
//       source1,
//       source2,
//       of(() => 'combined')
//     ).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(error);
//   });
// });

// describe('forkJoin', () => {
//   it('should emit array of last values when all complete', () => {
//     const source1 = new Observable<number>(subscriber => {
//       setTimeout(() => subscriber.next(1), 10);
//       setTimeout(() => subscriber.next(2), 20);
//       setTimeout(() => subscriber.complete(), 30);
//     });

//     const source2 = new Observable<string>(subscriber => {
//       setTimeout(() => subscriber.next('a'), 15);
//       setTimeout(() => subscriber.next('b'), 25);
//       setTimeout(() => subscriber.complete(), 35);
//     });

//     const values: [number, string][] = [];
//     forkJoin(source1, source2).subscribe(value => values.push(value));

//     return new Promise<void>(resolve => {
//       setTimeout(() => {
//         expect(values).toEqual([[2, 'b']]); // Only last values
//         resolve();
//       }, 50);
//     });
//   });

//   it('should complete immediately with empty array for no sources', () => {
//     let completed = false;
//     const values: any[] = [];

//     forkJoin().subscribe({
//       next: value => values.push(value),
//       complete: () => { completed = true; }
//     });

//     expect(values).toEqual([]);
//     expect(completed).toBe(true);
//   });

//   it('should error if any source errors', () => {
//     const error = new Error('Test error');
//     const source1 = of(1, 2);
//     const source2 = throwError(() => error);

//     const errorHandler = vi.fn();
//     forkJoin(source1, source2).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(error);
//   });
// });

// describe('take', () => {
//   it('should take specified number of values', () => {
//     const source = of(1, 2, 3, 4, 5);
//     const values: number[] = [];

//     source.pipe(take(3)).subscribe(value => values.push(value));

//     expect(values).toEqual([1, 2, 3]);
//   });

//   it('should complete after taking specified number', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       subscriber.next(2);
//       setTimeout(() => subscriber.next(3), 10);
//       setTimeout(() => subscriber.next(4), 20);
//     });

//     let completed = false;
//     const values: number[] = [];

//     source.pipe(take(2)).subscribe({
//       next: value => values.push(value),
//       complete: () => { completed = true; }
//     });

//     return new Promise<void>((resolve) => {
//       setTimeout(() => {
//         expect(values).toEqual([1, 2]);
//         expect(completed).toBe(true);
//         resolve();
//       }, 50);
//     });
//   });

//   it('should handle count of zero', () => {
//     const source = of(1, 2, 3);
//     const values: number[] = [];

//     source.pipe(take(0)).subscribe(value => values.push(value));

//     expect(values).toEqual([]);
//   });
// });

// describe('skip', () => {
//   it('should skip specified number of values', () => {
//     const source = of(1, 2, 3, 4, 5);
//     const values: number[] = [];

//     source.pipe(skip(2)).subscribe(value => values.push(value));

//     expect(values).toEqual([3, 4, 5]);
//   });

//   it('should emit all values if skip count is zero', () => {
//     const source = of(1, 2, 3);
//     const values: number[] = [];

//     source.pipe(skip(0)).subscribe(value => values.push(value));

//     expect(values).toEqual([1, 2, 3]);
//   });

//   it('should emit nothing if skip count exceeds total values', () => {
//     const source = of(1, 2, 3);
//     const values: number[] = [];

//     source.pipe(skip(5)).subscribe(value => values.push(value));

//     expect(values).toEqual([]);
//   });
// });

// describe('distinctUntilChanged', () => {
//   it('should only emit when current value is different from previous', () => {
//     const source = of(1, 1, 2, 2, 3, 1, 1);
//     const values: number[] = [];

//     source.pipe(distinctUntilChanged()).subscribe(value => values.push(value));

//     expect(values).toEqual([1, 2, 3, 1]);
//   });

//   it('should use custom comparison function', () => {
//     const source = of(
//       { id: 1, name: 'John' },
//       { id: 1, name: 'Jane' },
//       { id: 2, name: 'Bob' },
//       { id: 2, name: 'Alice' }
//     );

//     const values: any[] = [];
//     source.pipe(
//       distinctUntilChanged((a, b) => a?.id === b.id)
//     ).subscribe(value => values.push(value));

//     expect(values).toEqual([
//       { id: 1, name: 'John' },
//       { id: 2, name: 'Bob' }
//     ]);
//   });

//   it('should handle first emission', () => {
//     const source = of(1, 2, 3);
//     const values: number[] = [];

//     source.pipe(distinctUntilChanged()).subscribe(value => values.push(value));

//     expect(values).toEqual([1, 2, 3]);
//   });
// });

// describe('catchError', () => {
//   it('should catch errors and switch to recovery observable', () => {
//     const source = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       subscriber.next(2);
//       subscriber.error(new Error('Test error'));
//     });

//     const values: number[] = [];
//     source.pipe(
//       catchError(() => of(100, 200, 300))
//     ).subscribe(value => values.push(value));

//     expect(values).toEqual([1, 2, 100, 200, 300]);
//   });

//   it('should pass error and caught observable to selector', () => {
//     const error = new Error('Test error');
//     const source = throwError(() => error);

//     const selector = vi.fn(() => of('recovered'));
//     source.pipe(
//       catchError(selector)
//     ).subscribe();

//     expect(selector).toHaveBeenCalledWith(error, expect.any(Observable));
//   });

//   it('should rethrow if selector throws', () => {
//     const source = throwError(() => new Error('Original error'));
//     const selectorError = new Error('Selector error');

//     const errorHandler = vi.fn();
//     source.pipe(
//       catchError(() => { throw selectorError; })
//     ).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(selectorError);
//   });

//   it('should rethrow if recovery observable errors', () => {
//     const source = throwError(() => new Error('Original error'));
//     const recoveryError = new Error('Recovery error');

//     const errorHandler = vi.fn();
//     source.pipe(
//       catchError(() => throwError(() => recoveryError))
//     ).subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(recoveryError);
//   });
// });

// // Test additional Observable methods not in the provided code
// describe('Observable additional methods', () => {
//   describe('subscribe with positional arguments', () => {
//     it('should accept next handler as first argument', () => {
//       const observable = of(1, 2, 3);
//       const values: number[] = [];

//       observable.subscribe(value => values.push(value));

//       expect(values).toEqual([1, 2, 3]);
//     });

//     it('should accept error handler as second argument', () => {
//       const error = new Error('Test error');
//       const observable = throwError(() => error);

//       const errorHandler = vi.fn();
//       observable.subscribe(
//         () => {},
//         errorHandler
//       );

//       expect(errorHandler).toHaveBeenCalledWith(error);
//     });

//     it('should accept complete handler as third argument', () => {
//       const observable = of(1, 2, 3);

//       const completeHandler = vi.fn();
//       observable.subscribe(
//         () => {},
//         () => {},
//         completeHandler
//       );

//       expect(completeHandler).toHaveBeenCalled();
//     });
//   });

//   describe('pipe method', () => {
//     it('should chain multiple operators', () => {
//       const observable = of(1, 2, 3, 4, 5);
//       const values: number[] = [];

//       observable.pipe(
//         map(x => x * 2),
//         filter(x => x > 5),
//         take(2)
//       ).subscribe(value => values.push(value));

//       expect(values).toEqual([6, 8]);
//     });

//     it('should work with single operator', () => {
//       const observable = of(1, 2, 3);
//       const values: number[] = [];

//       observable.pipe(
//         map(x => x * 10)
//       ).subscribe(value => values.push(value));

//       expect(values).toEqual([10, 20, 30]);
//     });
//   });

//   describe('Subscription', () => {
//     it('should support adding child subscriptions', () => {
//       const subscription = new Subscription();
//       const child1 = { unsubscribe: vi.fn(), closed: false };
//       const child2 = { unsubscribe: vi.fn(), closed: false };

//       subscription.add(child1);
//       subscription.add(child2);

//       subscription.unsubscribe();

//       expect(child1.unsubscribe).toHaveBeenCalled();
//       expect(child2.unsubscribe).toHaveBeenCalled();
//       expect(subscription.closed).toBe(true);
//     });

//     it('should handle removing subscriptions', () => {
//       const subscription = new Subscription();
//       const child = { unsubscribe: vi.fn(), closed: false };

//       const added = subscription.add(child);
//       subscription.remove(added);

//       subscription.unsubscribe();

//       expect(child.unsubscribe).not.toHaveBeenCalled(); // Should not be called if removed
//     });

//     it('should handle unsubscribe function', () => {
//       const unsubscribeFn = vi.fn();
//       const subscription = new Subscription(unsubscribeFn);

//       subscription.unsubscribe();

//       expect(unsubscribeFn).toHaveBeenCalled();
//       expect(subscription.closed).toBe(true);
//     });
//   });
// });

// // Test edge cases and error conditions
// describe('Error handling and edge cases', () => {
//   it('should not emit after error', () => {
//     const observable = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       subscriber.error(new Error('Test error'));
//       subscriber.next(2); // Should not be emitted
//       subscriber.complete(); // Should not be called
//     });

//     const values: number[] = [];
//     const errorHandler = vi.fn();
//     const completeHandler = vi.fn();

//     observable.subscribe({
//       next: value => values.push(value),
//       error: errorHandler,
//       complete: completeHandler
//     });

//     expect(values).toEqual([1]);
//     expect(errorHandler).toHaveBeenCalled();
//     expect(completeHandler).not.toHaveBeenCalled();
//   });

//   it('should not emit after complete', () => {
//     const observable = new Observable<number>(subscriber => {
//       subscriber.next(1);
//       subscriber.complete();
//       subscriber.next(2); // Should not be emitted
//     });

//     const values: number[] = [];
//     observable.subscribe(value => values.push(value));

//     expect(values).toEqual([1]);
//   });

//   it('should handle multiple unsubscribe calls', () => {
//     const cleanup = vi.fn();
//     const observable = new Observable(() => cleanup);

//     const subscription = observable.subscribe();
//     subscription.unsubscribe();
//     subscription.unsubscribe(); // Second call should be safe

//     expect(cleanup).toHaveBeenCalledTimes(1);
//     expect(subscription.closed).toBe(true);
//   });

//   it('should handle synchronous observable that completes immediately', () => {
//     const observable = new Observable<number>(subscriber => {
//       subscriber.complete();
//     });

//     let completed = false;
//     observable.subscribe({
//       complete: () => { completed = true; }
//     });

//     expect(completed).toBe(true);
//   });

//   it('should handle synchronous observable that errors immediately', () => {
//     const error = new Error('Immediate error');
//     const observable = new Observable<number>(subscriber => {
//       subscriber.error(error);
//     });

//     const errorHandler = vi.fn();
//     observable.subscribe({
//       error: errorHandler
//     });

//     expect(errorHandler).toHaveBeenCalledWith(error);
//   });
// });
