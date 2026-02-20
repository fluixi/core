/**
 * Check if value is a function
 * @param v - The value to check
 * @returns True if the value is a function, false otherwise
 */
export declare function isFunction<T extends Function = Function>(v: unknown): v is T;
/**
 * Check if value is a Promise
 * @param v - The value to check
 * @returns True if the value is a Promise, false otherwise
 */
export declare function isPromise<T = any>(v: unknown): v is Promise<T>;
/**
 * Check if value is an async function
 * @param v - The value to check
 * @returns True if the value is an async function, false otherwise
 */
export declare function isAsyncFunction<T extends (...args: any) => Promise<any> = any>(v: unknown): v is T;
/**
 * Memoizes a function, caching results based on arguments
 * @param fn - Function to memoize
 * @param resolver - Optional function to generate cache key
 * @returns Memoized function with cache property
 * @example
 * const expensive = memoize((n: number) => {
 *   return n * n;
 * });
 * expensive(5); // Computed
 * expensive(5); // Cached
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, resolver?: (...args: Parameters<T>) => string): T & {
    cache: Map<string, ReturnType<T>>;
};
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param fn - Function to debounce
 * @param wait - Milliseconds to wait
 * @param options - Debounce options
 * @returns Debounced function with cancel method
 * @example
 * const debounced = debounce(() => console.log('Search'), 300);
 * debounced(); // Will execute after 300ms of inactivity
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, wait: number, options?: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
}): T & {
    cancel: () => void;
    flush: () => void;
    pending: () => boolean;
};
/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 * @param fn - Function to throttle
 * @param wait - Milliseconds to wait
 * @param options - Throttle options
 * @returns Throttled function with cancel method
 * @example
 * const throttled = throttle(() => console.log('Scroll'), 100);
 * window.addEventListener('scroll', throttled);
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, wait: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): T & {
    cancel: () => void;
    flush: () => void;
};
/**
 * Creates a function that is restricted to invoking func once
 * @param fn - Function to restrict
 * @returns Function that invokes func once
 * @example
 * const initialize = once(() => console.log('Initialized'));
 * initialize(); // Logs 'Initialized'
 * initialize(); // Does nothing
 */
export declare function once<T extends (...args: any[]) => any>(fn: T): T & {
    called: boolean;
};
/**
 * Creates a function that invokes func with arguments arranged according to the specified indexes
 * @param fn - Function to rearrange arguments for
 * @param indexes - Argument indexes
 * @returns New function with rearranged arguments
 * @example
 * const rearg = rearg((a, b, c) => [a, b, c], [2, 0, 1]);
 * rearg('a', 'b', 'c'); // ['c', 'a', 'b']
 */
export declare function rearg<T extends (...args: any[]) => any>(fn: T, ...indexes: number[]): (...args: any[]) => ReturnType<T>;
/**
 * Curries a function
 * @param fn - Function to curry
 * @param arity - Number of arguments (defaults to fn.length)
 * @returns Curried function
 * @example
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const curried = curry(add);
 * curried(1)(2)(3); // 6
 * curried(1, 2)(3); // 6
 */
export declare function curry<T extends (...args: any[]) => any>(fn: T, arity?: number): any;
/**
 * Composes functions from right to left
 * @param fns - Functions to compose
 * @returns Composed function
 * @example
 * const double = (x: number) => x * 2;
 * const addOne = (x: number) => x + 1;
 * const composed = compose(double, addOne);
 * composed(5); // 12 (addOne first, then double)
 */
export declare function compose<R>(...fns: Array<(arg: any) => any>): (arg: any) => R;
/**
 * Pipes functions from left to right
 * @param fns - Functions to pipe
 * @returns Piped function
 * @example
 * const double = (x: number) => x * 2;
 * const addOne = (x: number) => x + 1;
 * const piped = pipe(double, addOne);
 * piped(5); // 11 (double first, then addOne)
 */
export declare function pipe<R>(...fns: Array<(arg: any) => any>): (arg: any) => R;
/**
 * Creates a function that negates the result of the predicate func
 * @param predicate - Predicate to negate
 * @returns Negated predicate
 * @example
 * const isEven = (n: number) => n % 2 === 0;
 * const isOdd = negate(isEven);
 * isOdd(3); // true
 */
export declare function negate<T extends (...args: any[]) => boolean>(predicate: T): T;
/**
 * Creates a function that invokes func with its arguments transformed
 * @param fn - Function to wrap
 * @param transforms - Argument transforms
 * @returns New function with transformed arguments
 * @example
 * const doubled = overArgs((x, y) => [x, y], [x => x * 2, x => x * 3]);
 * doubled(1, 1); // [2, 3]
 */
export declare function overArgs<T extends (...args: any[]) => any>(fn: T, ...transforms: Array<(arg: any) => any>): (...args: any[]) => ReturnType<T>;
/**
 * Creates a function that invokes func with partials prepended to the arguments
 * @param fn - Function to partially apply arguments to
 * @param partials - Arguments to be partially applied
 * @returns Partially applied function
 * @example
 * const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
 * const sayHello = partial(greet, 'Hello');
 * sayHello('World'); // 'Hello, World!'
 */
export declare function partial<T extends (...args: any[]) => any>(fn: T, ...partials: any[]): (...args: any[]) => ReturnType<T>;
/**
 * Creates a function that invokes func with partials appended to the arguments
 * @param fn - Function to partially apply arguments to
 * @param partials - Arguments to be partially applied
 * @returns Partially applied function
 * @example
 * const greet = (name: string, greeting: string) => `${greeting}, ${name}!`;
 * const greetWorld = partialRight(greet, 'Hello');
 * greetWorld('World'); // 'Hello, World!'
 */
export declare function partialRight<T extends (...args: any[]) => any>(fn: T, ...partials: any[]): (...args: any[]) => ReturnType<T>;
/**
 * Creates a function that invokes func with the this binding of the created function
 * @param fn - Function to bind
 * @param thisArg - The this binding of func
 * @param partials - Arguments to be partially applied
 * @returns Bound function
 * @example
 * const obj = { x: 42 };
 * const getX = bind(function() { return this.x; }, obj);
 * getX(); // 42
 */
export declare function bind<T extends (...args: any[]) => any>(fn: T, thisArg: any, ...partials: any[]): (...args: any[]) => ReturnType<T>;
/**
 * Creates a function that invokes func with arguments reversed
 * @param fn - Function to flip arguments for
 * @returns Function with flipped arguments
 * @example
 * const flipped = flip((a, b, c) => [a, b, c]);
 * flipped(1, 2, 3); // [3, 2, 1]
 */
export declare function flip<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T>;
/**
 * Creates a function that accepts up to n arguments, ignoring any additional arguments
 * @param fn - Function to cap arguments for
 * @param n - Arity cap
 * @returns Function with capped arity
 * @example
 * const capped = ary((a, b, c) => [a, b, c], 2);
 * capped(1, 2, 3, 4); // [1, 2, undefined]
 */
export declare function ary<T extends (...args: any[]) => any>(fn: T, n: number): (...args: any[]) => ReturnType<T>;
/**
 * Creates a function that accepts up to one argument, ignoring any additional arguments
 * @param fn - Function to cap arguments for
 * @returns Unary function
 * @example
 * const unary = unary(parseInt);
 * ['6', '8', '10'].map(unary); // [6, 8, 10] instead of [6, NaN, 2]
 */
export declare function unary<T extends (arg: any, ...rest: any[]) => any>(fn: T): (arg: Parameters<T>[0]) => ReturnType<T>;
/**
 * Defers invoking the func until the current call stack has cleared
 * @param fn - Function to defer
 * @param args - Arguments to invoke func with
 * @returns Timer id
 * @example
 * defer(console.log, 'Deferred');
 */
export declare function defer<T extends (...args: any[]) => any>(fn: T, ...args: Parameters<T>): ReturnType<typeof setTimeout>;
/**
 * Delays invoking func until after wait milliseconds
 * @param fn - Function to delay
 * @param wait - Milliseconds to delay invocation
 * @param args - Arguments to invoke func with
 * @returns Timer id
 * @example
 * delay(console.log, 1000, 'Delayed');
 */
export declare function delay<T extends (...args: any[]) => any>(fn: T, wait: number, ...args: Parameters<T>): ReturnType<typeof setTimeout>;
/**
 * Creates a function that memoizes the result of func with a Time-To-Live (TTL)
 * @param fn - Function to memoize
 * @param ttl - Time to live in milliseconds
 * @param resolver - Optional function to generate cache key
 * @returns Memoized function with TTL
 * @example
 * const expensiveApi = memoizeWithTTL(fetchData, 60000); // Cache for 1 minute
 */
export declare function memoizeWithTTL<T extends (...args: any[]) => any>(fn: T, ttl: number, resolver?: (...args: Parameters<T>) => string): T & {
    cache: Map<string, {
        value: ReturnType<T>;
        expires: number;
    }>;
};
/**
 * Creates a function that invokes func at most n times
 * @param fn - Function to restrict
 * @param n - Number of calls at which to stop executing func
 * @returns Restricted function
 * @example
 * const limited = before((n) => console.log(n), 3);
 * limited(1); // Logs 1
 * limited(2); // Logs 2
 * limited(3); // Does nothing
 */
export declare function before<T extends (...args: any[]) => any>(fn: T, n: number): T;
/**
 * Creates a function that invokes func once it's called n or more times
 * @param fn - Function to restrict
 * @param n - Number of calls before func is invoked
 * @returns Restricted function
 * @example
 * const afterThree = after((n) => console.log('Called!'), 3);
 * afterThree(); // Does nothing
 * afterThree(); // Does nothing
 * afterThree(); // Logs 'Called!'
 */
export declare function after<T extends (...args: any[]) => any>(fn: T, n: number): T;
/**
 * Wraps a function to catch and handle errors
 * @param fn - Function to wrap
 * @param errorHandler - Error handler function
 * @returns Wrapped function
 * @example
 * const safe = tryCatch(
 *   () => JSON.parse('invalid'),
 *   (error) => ({ error: error.message })
 * );
 */
export declare function tryCatch<T extends (...args: any[]) => any>(fn: T, errorHandler: (error: Error, ...args: Parameters<T>) => any): T;
/**
 * Creates a function that returns the result of invoking the given functions with the this binding of the created function,
 * where each successive invocation is supplied the return value of the previous
 * @param fns - Functions to invoke
 * @returns Flow function
 * @example
 * const calculate = flow(
 *   (n: number) => n * 2,
 *   (n: number) => n + 1,
 *   (n: number) => n * 3
 * );
 * calculate(5); // 33
 */
export declare function flow<R>(...fns: Array<(arg: any) => any>): (arg: any) => R;
/**
 * Creates a function that returns the result of invoking the given functions from right to left
 * @param fns - Functions to invoke
 * @returns Flow right function
 * @example
 * const calculate = flowRight(
 *   (n: number) => n * 3,
 *   (n: number) => n + 1,
 *   (n: number) => n * 2
 * );
 * calculate(5); // 33
 */
export declare function flowRight<R>(...fns: Array<(arg: any) => any>): (arg: any) => R;
/**
 * Wraps an async function to retry on failure
 * @param fn - Async function to wrap
 * @param options - Retry options
 * @returns Wrapped function with retry logic
 * @example
 * const fetchWithRetry = retry(fetchData, { retries: 3, delay: 1000 });
 */
export declare function retry<T extends (...args: any[]) => Promise<any>>(fn: T, options?: {
    retries?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
}): T;
/**
 * Creates a function that invokes func with a timeout
 * @param fn - Function to wrap with timeout
 * @param timeout - Timeout in milliseconds
 * @param onTimeout - Optional callback when timeout occurs
 * @returns Function with timeout
 * @example
 * const timedFetch = withTimeout(fetchData, 5000);
 */
export declare function withTimeout<T extends (...args: any[]) => Promise<any>>(fn: T, timeout: number, onTimeout?: () => void): T;
//# sourceMappingURL=functions.d.ts.map