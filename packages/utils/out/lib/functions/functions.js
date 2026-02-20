import { isClass } from '@awc/utils/object';
/**
 * Check if value is a function
 * @param v - The value to check
 * @returns True if the value is a function, false otherwise
 */
export function isFunction(v) {
    return typeof v === 'function' && !isClass(v);
}
/**
 * Check if value is a Promise
 * @param v - The value to check
 * @returns True if the value is a Promise, false otherwise
 */
export function isPromise(v) {
    return (!!v && (typeof v === 'object' || typeof v === 'function') && 'then' in v);
}
/**
 * Check if value is an async function
 * @param v - The value to check
 * @returns True if the value is an async function, false otherwise
 */
export function isAsyncFunction(v) {
    return isFunction(v) && v.constructor.name === 'AsyncFunction';
}
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
export function memoize(fn, resolver) {
    const cache = new Map();
    const memoized = function (...args) {
        const key = resolver ? resolver(...args) : JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
    memoized.cache = cache;
    return memoized;
}
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
export function debounce(fn, wait, options = {}) {
    const { leading = false, trailing = true, maxWait } = options;
    let timerId;
    let maxTimerId;
    let lastCallTime;
    let lastInvokeTime = 0;
    let lastArgs;
    let lastThis;
    let result;
    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = fn.apply(thisArg, args);
        return result;
    }
    function startTimer(pendingFunc, wait) {
        return setTimeout(pendingFunc, wait);
    }
    function cancelTimer(id) {
        if (id !== undefined) {
            clearTimeout(id);
        }
    }
    function leadingEdge(time) {
        lastInvokeTime = time;
        timerId = startTimer(timerExpired, wait);
        return leading ? invokeFunc(time) : result;
    }
    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;
        return maxWait !== undefined
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }
    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        return (lastCallTime === undefined ||
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 ||
            (maxWait !== undefined && timeSinceLastInvoke >= maxWait));
    }
    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            trailingEdge(time);
            return;
        }
        timerId = startTimer(timerExpired, remainingWait(time));
    }
    function trailingEdge(time) {
        timerId = undefined;
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    }
    function cancel() {
        cancelTimer(timerId);
        cancelTimer(maxTimerId);
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = maxTimerId = undefined;
    }
    function flush() {
        return timerId === undefined ? result : trailingEdge(Date.now());
    }
    function pending() {
        return timerId !== undefined;
    }
    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        if (isInvoking) {
            if (timerId === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait !== undefined) {
                timerId = startTimer(timerExpired, wait);
                return invokeFunc(lastCallTime);
            }
        }
        if (timerId === undefined) {
            timerId = startTimer(timerExpired, wait);
        }
        return result;
    }
    debounced.cancel = cancel;
    debounced.flush = flush;
    debounced.pending = pending;
    return debounced;
}
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
export function throttle(fn, wait, options = {}) {
    const { leading = true, trailing = true } = options;
    return debounce(fn, wait, {
        leading,
        trailing,
        maxWait: wait,
    });
}
/**
 * Creates a function that is restricted to invoking func once
 * @param fn - Function to restrict
 * @returns Function that invokes func once
 * @example
 * const initialize = once(() => console.log('Initialized'));
 * initialize(); // Logs 'Initialized'
 * initialize(); // Does nothing
 */
export function once(fn) {
    let called = false;
    let result;
    const wrapped = function (...args) {
        if (!called) {
            called = true;
            result = fn.apply(this, args);
        }
        return result;
    };
    Object.defineProperty(wrapped, 'called', {
        get() {
            return called;
        },
    });
    return wrapped;
}
/**
 * Creates a function that invokes func with arguments arranged according to the specified indexes
 * @param fn - Function to rearrange arguments for
 * @param indexes - Argument indexes
 * @returns New function with rearranged arguments
 * @example
 * const rearg = rearg((a, b, c) => [a, b, c], [2, 0, 1]);
 * rearg('a', 'b', 'c'); // ['c', 'a', 'b']
 */
export function rearg(fn, ...indexes) {
    return function (...args) {
        const reordered = indexes.map((i) => args[i]);
        return fn.apply(this, reordered);
    };
}
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
export function curry(fn, arity = fn.length) {
    return function curried(...args) {
        if (args.length >= arity) {
            return fn.apply(this, args);
        }
        return function (...nextArgs) {
            return curried.apply(this, [...args, ...nextArgs]);
        };
    };
}
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
export function compose(...fns) {
    return fns.reduceRight((prevFn, nextFn) => (value) => nextFn(prevFn(value)), (value) => value);
}
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
export function pipe(...fns) {
    return fns.reduce((prevFn, nextFn) => (value) => nextFn(prevFn(value)), (value) => value);
}
/**
 * Creates a function that negates the result of the predicate func
 * @param predicate - Predicate to negate
 * @returns Negated predicate
 * @example
 * const isEven = (n: number) => n % 2 === 0;
 * const isOdd = negate(isEven);
 * isOdd(3); // true
 */
export function negate(predicate) {
    return function (...args) {
        return !predicate.apply(this, args);
    };
}
/**
 * Creates a function that invokes func with its arguments transformed
 * @param fn - Function to wrap
 * @param transforms - Argument transforms
 * @returns New function with transformed arguments
 * @example
 * const doubled = overArgs((x, y) => [x, y], [x => x * 2, x => x * 3]);
 * doubled(1, 1); // [2, 3]
 */
export function overArgs(fn, ...transforms) {
    return function (...args) {
        const transformedArgs = args.map((arg, index) => transforms[index] ? transforms[index](arg) : arg);
        return fn.apply(this, transformedArgs);
    };
}
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
export function partial(fn, ...partials) {
    return function (...args) {
        return fn.apply(this, [...partials, ...args]);
    };
}
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
export function partialRight(fn, ...partials) {
    return function (...args) {
        return fn.apply(this, [...args, ...partials]);
    };
}
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
export function bind(fn, thisArg, ...partials) {
    return function (...args) {
        return fn.apply(thisArg, [...partials, ...args]);
    };
}
/**
 * Creates a function that invokes func with arguments reversed
 * @param fn - Function to flip arguments for
 * @returns Function with flipped arguments
 * @example
 * const flipped = flip((a, b, c) => [a, b, c]);
 * flipped(1, 2, 3); // [3, 2, 1]
 */
export function flip(fn) {
    return function (...args) {
        return fn.apply(this, args.reverse());
    };
}
/**
 * Creates a function that accepts up to n arguments, ignoring any additional arguments
 * @param fn - Function to cap arguments for
 * @param n - Arity cap
 * @returns Function with capped arity
 * @example
 * const capped = ary((a, b, c) => [a, b, c], 2);
 * capped(1, 2, 3, 4); // [1, 2, undefined]
 */
export function ary(fn, n) {
    return function (...args) {
        return fn.apply(this, args.slice(0, n));
    };
}
/**
 * Creates a function that accepts up to one argument, ignoring any additional arguments
 * @param fn - Function to cap arguments for
 * @returns Unary function
 * @example
 * const unary = unary(parseInt);
 * ['6', '8', '10'].map(unary); // [6, 8, 10] instead of [6, NaN, 2]
 */
export function unary(fn) {
    return function (arg) {
        return fn.call(this, arg);
    };
}
/**
 * Defers invoking the func until the current call stack has cleared
 * @param fn - Function to defer
 * @param args - Arguments to invoke func with
 * @returns Timer id
 * @example
 * defer(console.log, 'Deferred');
 */
export function defer(fn, ...args) {
    return setTimeout(fn, 1, ...args);
}
/**
 * Delays invoking func until after wait milliseconds
 * @param fn - Function to delay
 * @param wait - Milliseconds to delay invocation
 * @param args - Arguments to invoke func with
 * @returns Timer id
 * @example
 * delay(console.log, 1000, 'Delayed');
 */
export function delay(fn, wait, ...args) {
    return setTimeout(fn, wait, ...args);
}
/**
 * Creates a function that memoizes the result of func with a Time-To-Live (TTL)
 * @param fn - Function to memoize
 * @param ttl - Time to live in milliseconds
 * @param resolver - Optional function to generate cache key
 * @returns Memoized function with TTL
 * @example
 * const expensiveApi = memoizeWithTTL(fetchData, 60000); // Cache for 1 minute
 */
export function memoizeWithTTL(fn, ttl, resolver) {
    const cache = new Map();
    const memoized = function (...args) {
        const key = resolver ? resolver(...args) : JSON.stringify(args);
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && cached.expires > now) {
            return cached.value;
        }
        const result = fn.apply(this, args);
        cache.set(key, { value: result, expires: now + ttl });
        // Cleanup expired entries
        for (const [k, v] of cache.entries()) {
            if (v.expires <= now) {
                cache.delete(k);
            }
        }
        return result;
    };
    memoized.cache = cache;
    return memoized;
}
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
export function before(fn, n) {
    let result;
    let callCount = 0;
    return function (...args) {
        if (++callCount < n) {
            result = fn.apply(this, args);
        }
        if (callCount >= n) {
            // @ts-ignore - Allow clearing function reference
            fn = undefined;
        }
        return result;
    };
}
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
export function after(fn, n) {
    let callCount = 0;
    return function (...args) {
        if (++callCount >= n) {
            return fn.apply(this, args);
        }
        return undefined;
    };
}
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
export function tryCatch(fn, errorHandler) {
    return function (...args) {
        try {
            return fn.apply(this, args);
        }
        catch (error) {
            return errorHandler(error, ...args);
        }
    };
}
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
export function flow(...fns) {
    return pipe(...fns);
}
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
export function flowRight(...fns) {
    return compose(...fns);
}
/**
 * Wraps an async function to retry on failure
 * @param fn - Async function to wrap
 * @param options - Retry options
 * @returns Wrapped function with retry logic
 * @example
 * const fetchWithRetry = retry(fetchData, { retries: 3, delay: 1000 });
 */
export function retry(fn, options = {}) {
    const { retries = 3, delay = 1000, backoff = 2, onRetry } = options;
    return async function (...args) {
        let lastError;
        let currentDelay = delay;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn.apply(this, args);
            }
            catch (error) {
                lastError = error;
                if (attempt < retries) {
                    if (onRetry) {
                        onRetry(lastError, attempt + 1);
                    }
                    await new Promise((resolve) => setTimeout(resolve, currentDelay));
                    currentDelay *= backoff;
                }
            }
        }
        throw lastError;
    };
}
/**
 * Creates a function that invokes func with a timeout
 * @param fn - Function to wrap with timeout
 * @param timeout - Timeout in milliseconds
 * @param onTimeout - Optional callback when timeout occurs
 * @returns Function with timeout
 * @example
 * const timedFetch = withTimeout(fetchData, 5000);
 */
export function withTimeout(fn, timeout, onTimeout) {
    return async function (...args) {
        return Promise.race([
            fn.apply(this, args),
            new Promise((_, reject) => setTimeout(() => {
                if (onTimeout)
                    onTimeout();
                reject(new Error(`Function timed out after ${timeout}ms`));
            }, timeout)),
        ]);
    };
}
