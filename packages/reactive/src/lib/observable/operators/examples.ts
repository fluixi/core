// // of - Creating from multiple values
// const numbers$ = of(1, 2, 3, 4, 5);
// const mixed$ = of('hello', 42, true, { data: 'test' });

// // from - Universal conversion
// const promise$ = from(fetch('/api/data').then(r => r.json()));
// const array$ = from([1, 2, 3]);
// const string$ = from('Hello World'); // Emits each character
// const set$ = from(new Set([1, 2, 3, 2, 1])); // Emits 1, 2, 3

// // forkJoin - Parallel execution
// const parallelRequests$ = forkJoin([
//     from(fetch('/api/users')),
//     from(fetch('/api/posts')),
//     from(fetch('/api/comments'))
// ]);

// const namedRequests$ = forkJoin({
//     user: from(fetch('/api/user/1')),
//     posts: from(fetch('/api/user/1/posts')),
//     comments: from(fetch('/api/user/1/comments'))
// });

// // fromValue - Single value
// const singleValue$ = fromValue(42);
// const delayedValue$ = fromValue('delayed', asyncScheduler);

// // Complex example combining operators
// const complexExample$ = fromValue({ id: 1 }).pipe(
//     mergeMap(user => forkJoin({
//         details: from(fetch(`/api/user/${user.id}`).then(r => r.json())),
//         posts: from(fetch(`/api/user/${user.id}/posts`).then(r => r.json()))
//     })),
//     catchError(err => of({ error: err.message }))
// );


// Debounce

// // timer - Basic usage
// timer(1000).subscribe(() => console.log('1 second passed'));

// // timer - Periodic emissions
// const subscription = timer(0, 1000).subscribe(value => {
//     console.log(`Second ${value + 1}`);
//     if (value >= 4) subscription.unsubscribe();
// });

// // timer - With Date
// const alarmTime = new Date(Date.now() + 5000);
// timer(alarmTime).subscribe(() => console.log('Wake up!'));

// // timer - With custom scheduler
// const testScheduler = new TestScheduler();
// timer(10, 5, testScheduler).subscribe(value => {
//     console.log(`Test timer: ${value}`);
// });
// testScheduler.flush(50);

// // debounceTime - Search input
// const searchInput = document.getElementById('search') as HTMLInputElement;
// fromEvent(searchInput, 'input').pipe(
//     map((e: Event) => (e.target as HTMLInputElement).value),
//     debounceTime(300)
// ).subscribe(value => {
//     console.log(`Searching: ${value}`);
//     // Make API call here
// });

// // debounceTime - Window resize
// fromEvent(window, 'resize').pipe(
//     debounceTime(250)
// ).subscribe(() => {
//     console.log('Window resized (debounced)');
//     updateLayout();
// });

// // debounceTime - With leading/trailing
// fromEvent(button, 'click').pipe(
//     debounceTime(1000, { leading: true, trailing: false })
// ).subscribe(() => {
//     console.log('Button clicked (leading edge only)');
// });

// // debounceTime - With maxWait
// fromEvent(document, 'mousemove').pipe(
//     debounceTime(100, { maxWait: 1000 })
// ).subscribe(() => {
//     console.log('Mouse moved (max 1 second between emissions)');
// });

// // Complex example: Debounced autocomplete with timer
// const searchResults$ = fromEvent(searchInput, 'input').pipe(
//     map(event => (event.target as HTMLInputElement).value),
//     debounceTime(300),
//     filter(query => query.length >= 3),
//     distinctUntilChanged(),
//     switchMap(query => 
//         timer(0, 1000).pipe(
//             take(5),
//             map(i => `Result ${i + 1} for "${query}"`)
//         )
//     )
// );

// // Error handling
// const errorProne$ = throwError(() => new Error('Source error')).pipe(
//     debounceTime(100)
// ).subscribe({
//     error: err => console.error('Error:', err)
// });



// /**
//  * Virtual scheduler for testing time-based operations
//  * Similar to RxJS TestScheduler for marble testing
//  */
// export interface VirtualScheduler extends Scheduler {
//     /**
//      * Advance the virtual clock by specified milliseconds
//      */
//     advanceBy: (ms: number) => void;
    
//     /**
//      * Get current virtual time
//      */
//     now: () => number;
    
//     /**
//      * Schedule a task with absolute time
//      */
//     scheduleAt: (task: () => void, absoluteTime: number) => { unsubscribe: () => void };
// }

// /**
//  * Creates a virtual test scheduler for unit testing
//  * Allows control over time in tests
//  */
// export function createTestScheduler(): VirtualScheduler {
//     let currentTime = 0;
//     const scheduledTasks: Array<{
//         time: number;
//         task: () => void;
//         id: number;
//     }> = [];
//     let nextId = 0;
    
//     return {
//         schedule(task: () => void, delay: number = 0) {
//             const id = nextId++;
//             const scheduledTime = currentTime + delay;
            
//             scheduledTasks.push({
//                 time: scheduledTime,
//                 task,
//                 id
//             });
            
//             // Sort by scheduled time (ascending)
//             scheduledTasks.sort((a, b) => a.time - b.time);
            
//             return {
//                 unsubscribe: () => {
//                     const index = scheduledTasks.findIndex(t => t.id === id);
//                     if (index > -1) {
//                         scheduledTasks.splice(index, 1);
//                     }
//                 }
//             };
//         },
        
//         scheduleAt(task: () => void, absoluteTime: number) {
//             return this.schedule(task, absoluteTime - currentTime);
//         },
        
//         advanceBy(ms: number) {
//             const targetTime = currentTime + ms;
            
//             while (scheduledTasks.length > 0 && scheduledTasks[0].time <= targetTime) {
//                 const task = scheduledTasks.shift()!;
//                 currentTime = task.time;
//                 task.task();
//             }
            
//             currentTime = targetTime;
//         },
        
//         now() {
//             return currentTime;
//         }
//     };
// }

// // 1. Standard usage with default asyncScheduler
// fromFetch<{ data: string }>('https://api.example.com/data', {
//     timeout: 5000
// }).subscribe({
//     next: data => console.log('Received:', data),
//     error: err => {
//         if (err.name === 'TimeoutError') {
//             console.error('Request timed out after 5 seconds');
//         } else {
//             console.error('Error:', err.message);
//         }
//     }
// });

// // 2. Using with custom selector and scheduler
// fromFetch('/api/stream', {
//     selector: (response) => {
//         // Process as stream
//         return new Observable(subscriber => {
//             const reader = response.body!.getReader();
//             const decoder = new TextDecoder();
            
//             async function read() {
//                 const { done, value } = await reader.read();
//                 if (done) {
//                     subscriber.complete();
//                     return;
//                 }
                
//                 const text = decoder.decode(value);
//                 subscriber.next(text);
//                 read(); // Continue reading
//             }
            
//             read();
            
//             return () => reader.cancel();
//         });
//     }
// }, asyncScheduler).subscribe(chunk => {
//     console.log('Stream chunk:', chunk);
// });

// // 3. Testing with virtual scheduler
// import { describe, it, expect } from 'vitest';

// describe('fromFetch with test scheduler', () => {
//     it('should timeout after specified delay', () => {
//         const testScheduler = createTestScheduler();
//         const mockFetch = () => new Promise<Response>(() => {
//             // Never resolves
//         });
        
//         // Override global fetch for test
//         const originalFetch = globalThis.fetch;
//         globalThis.fetch = mockFetch as any;
        
//         const values: any[] = [];
//         const errors: any[] = [];
        
//         fromFetch('http://test.com', { timeout: 1000 }, testScheduler)
//             .subscribe({
//                 next: (value) => values.push(value),
//                 error: (err) => errors.push(err)
//             });
        
//         // Advance time to trigger timeout
//         testScheduler.advanceBy(1500);
        
//         expect(errors).toHaveLength(1);
//         expect(errors[0].name).toBe('TimeoutError');
        
//         // Restore original fetch
//         globalThis.fetch = originalFetch;
//     });
    
//     it('should handle successful response', () => {
//         const testScheduler = createTestScheduler();
        
//         const mockResponse = {
//             ok: true,
//             headers: new Headers({ 'Content-Type': 'application/json' }),
//             json: () => Promise.resolve({ data: 'test' })
//         } as Response;
        
//         const mockFetch = () => Promise.resolve(mockResponse);
//         const originalFetch = globalThis.fetch;
//         globalThis.fetch = mockFetch as any;
        
//         const values: any[] = [];
        
//         fromFetch('http://test.com', {}, testScheduler)
//             .subscribe({
//                 next: (value) => values.push(value)
//             });
        
//         // Advance time to process response
//         testScheduler.advanceBy(10);
        
//         expect(values).toEqual([{ data: 'test' }]);
        
//         globalThis.fetch = originalFetch;
//     });
// });



// // Combining operators
// fromArrayLike([
//     { user: { name: 'Alice', score: 95 } },
//     { user: { name: 'Bob', score: 85 } },
//     { user: { name: 'Charlie', score: 92 } }
// ])
// .pipe(
//     pluck('user'),
//     pluck('name'),
//     skip(1)
// )
// .subscribe(name => console.log('Name after skip:', name)); // 'Bob', 'Charlie'

// // Partition with pluck
// const [activeUsers$, inactiveUsers$] = partition(
//     userData$,
//     user => user.status === 'active'
// );

// // Get only active user emails
// activeUsers$
//     .pipe(pluck('email'))
//     .subscribe(email => sendNotification(email));

// // fromArrayLike with custom scheduler
// const animationScheduler: Scheduler = {
//     schedule(task, delay) {
//         const id = requestAnimationFrame(() => {
//             if (delay > 0) {
//                 setTimeout(task, delay);
//             } else {
//                 task();
//             }
//         });
//         return { unsubscribe: () => cancelAnimationFrame(id) };
//     }
// };

// // Animate values with frame scheduling
// fromArrayLike([0, 0.25, 0.5, 0.75, 1.0], {
//     scheduler: animationScheduler
// }).subscribe(progress => {
//     element.style.opacity = progress.toString();
// });




// // 1. empty examples
// console.log('=== empty Examples ===');

// // Synchronous empty
// empty().subscribe({
//     next: () => console.log('Never happens'),
//     complete: () => console.log('Immediately completed')
// });

// // Asynchronous empty with scheduler
// empty({
//     scheduler: asyncScheduler,
//     delay: 2000
// }).subscribe({
//     complete: () => console.log('Completed after 2 seconds')
// });

// // Using empty as a placeholder
// const userInput$ = someCondition 
//     ? fromEvent(input, 'change')
//     : empty(); // No events if condition false

// // 2. fromPromise examples
// console.log('\n=== fromPromise Examples ===');

// // Basic promise conversion
// const basicPromise = Promise.resolve(42);
// fromPromise(basicPromise).subscribe({
//     next: value => console.log('Resolved value:', value),
//     complete: () => console.log('Promise completed')
// });

// // Promise with error
// const failingPromise = Promise.reject(new Error('Failed'));
// fromPromise(failingPromise).subscribe({
//     error: err => console.error('Promise rejected:', err.message)
// });

// // With timeout
// const slowPromise = new Promise(resolve => {
//     setTimeout(() => resolve('Slow result'), 3000);
// });

// fromPromise(slowPromise, {
//     timeout: 1000
// }).subscribe({
//     next: value => console.log('This wont execute'),
//     error: err => {
//         if (err.name === 'TimeoutError') {
//             console.log('Promise timed out after 1 second');
//         }
//     }
// });

// // With abort signal
// const controller = new AbortController();
// const fetchPromise = fetch('/api/data', { 
//     signal: controller.signal 
// });

// fromPromise(fetchPromise, {
//     signal: controller.signal
// }).subscribe({
//     error: err => {
//         if (err.name === 'AbortError') {
//             console.log('Fetch was aborted');
//         }
//     }
// });

// // Abort after 500ms
// setTimeout(() => controller.abort(), 500);

// // With scheduler for delayed emission
// fromPromise(Promise.resolve('Hello'), {
//     scheduler: asyncScheduler,
//     delay: 1000
// }).subscribe(value => {
//     console.log('Delayed greeting:', value); // After 1 second
// });

// // 3. toPromise examples
// console.log('\n=== toPromise Examples ===');

// // Create a test observable
// const testObservable = new Observable<number>(observer => {
//     observer.next(1);
//     observer.next(2);
//     observer.next(3);
//     setTimeout(() => {
//         observer.next(4);
//         observer.complete();
//     }, 100);
// });

// // Basic toPromise (last value)
// testObservable.toPromise().then(value => {
//     console.log('Last value:', value); // 4
// });

// // First value strategy
// testObservable.toPromise({ 
//     strategy: 'first' 
// }).then(value => {
//     console.log('First value:', value); // 1
// });

// // Single value strategy (with single emission)
// const singleObservable = new Observable(obs => {
//     obs.next(42);
//     obs.complete();
// });

// singleObservable.toPromise({ 
//     strategy: 'single' 
// }).then(value => {
//     console.log('Single value:', value); // 42
// });

// // Single value strategy with multiple emissions (rejects)
// testObservable.toPromise({ 
//     strategy: 'single' 
// }).catch(err => {
//     console.error('Single strategy error:', err.message);
// });

// // With timeout
// const slowObservable = new Observable(obs => {
//     setTimeout(() => {
//         obs.next('Slow value');
//         obs.complete();
//     }, 2000);
// });

// slowObservable.toPromise({ 
//     timeout: 1000 
// }).catch(err => {
//     if (err.name === 'TimeoutError') {
//         console.log('Observable timeout after 1 second');
//     }
// });

// // With abort signal
// const abortController = new AbortController();
// const longObservable = new Observable(obs => {
//     const interval = setInterval(() => {
//         obs.next(new Date().toISOString());
//     }, 100);
    
//     return () => clearInterval(interval);
// });

// longObservable.toPromise({
//     signal: abortController.signal
// }).catch(err => {
//     if (err.name === 'AbortError') {
//         console.log('toPromise was aborted');
//     }
// });

// // Abort after 500ms
// setTimeout(() => abortController.abort(), 500);

// // With default value for empty observables
// empty().toPromise({ 
//     defaultValue: 'Default' 
// }).then(value => {
//     console.log('Default value for empty:', value); // 'Default'
// });

// // Combining with fromPromise (circular but demonstrates type safety)
// fromPromise(Promise.resolve({ data: 'test' }))
//     .pipe(
//         pluck('data')
//     )
//     .toPromise()
//     .then(data => {
//         console.log('Extracted data:', data); // 'test'
//     });




// 1. defer examples
// console.log('=== defer Examples ===');

// // Lazy random number
// defer(() => Math.random()).subscribe(value => {
//     console.log('Random value:', value); // Different on each subscription
// });

// // Lazy API call
// defer(() => fetch('/api/data').then(res => res.json()))
//     .subscribe(data => console.log('API data:', data));

// // With retry logic
// let attempt = 0;
// defer(
//     () => {
//         attempt++;
//         console.log(`Factory attempt ${attempt}`);
//         if (attempt < 3) {
//             throw new Error('Temporary failure');
//         }
//         return Promise.resolve('Success!');
//     },
//     {
//         retry: 2,
//         retryDelay: 100
//     }
// ).subscribe({
//     next: value => console.log('Result:', value),
//     error: err => console.error('Failed after retries:', err.message)
// });

// // Async factory creation
// defer(
//     () => {
//         console.log('Factory called');
//         return fromArrayLike([1, 2, 3]);
//     },
//     {
//         scheduler: asyncScheduler,
//         delay: 1000
//     }
// ).subscribe(value => console.log('Deferred value:', value));

// // 2. throwIfEmpty examples
// console.log('\n=== throwIfEmpty Examples ===');

// // Basic empty observable
// empty().pipe(
//     throwIfEmpty()
// ).subscribe({
//     error: err => console.log('Empty error:', err.message) // 'no elements in sequence'
// });

// // Non-empty observable
// fromArrayLike([1, 2, 3]).pipe(
//     throwIfEmpty()
// ).subscribe({
//     next: value => console.log('Value:', value),
//     complete: () => console.log('Completed successfully')
// });

// // With custom error
// empty().pipe(
//     throwIfEmpty({
//         errorFactory: () => new Error('Custom empty error')
//     })
// ).subscribe({
//     error: err => console.log('Custom error:', err.message)
// });

// // Async error throwing
// empty().pipe(
//     throwIfEmpty({
//         scheduler: asyncScheduler,
//         delay: 2000
//     })
// ).subscribe({
//     error: err => console.log('Async error after 2s:', err.message)
// });

// // Combined with other operators
// fromArrayLike([]).pipe(
//     map(x => x * 2),
//     throwIfEmpty()
// ).subscribe({
//     error: err => console.log('Filtered empty error:', err.message)
// });

// // 3. single examples
// console.log('\n=== single Examples ===');

// // Exactly one value
// fromArrayLike([42]).pipe(
//     single()
// ).subscribe(value => console.log('Single value:', value));

// // Multiple values - throws
// fromArrayLike([1, 2, 3]).pipe(
//     single()
// ).subscribe({
//     next: () => console.log('This wont execute'),
//     error: err => console.log('Multiple values error:', err.message)
// });

// // With predicate
// fromArrayLike([1, 2, 3, 4, 5]).pipe(
//     single({ predicate: x => x > 4 })
// ).subscribe(value => console.log('Single > 4:', value)); // 5

// // Predicate with no match
// fromArrayLike([1, 2, 3]).pipe(
//     single({ predicate: x => x > 5 })
// ).subscribe({
//     error: err => console.log('No match error:', err.message)
// });

// // With default value
// empty().pipe(
//     single({ defaultValue: 100 })
// ).subscribe(value => console.log('Default value:', value)); // 100

// // Type-safe predicate
// interface User { id: number; name: string; }
// const users: User[] = [
//     { id: 1, name: 'Alice' },
//     { id: 2, name: 'Bob' }
// ];

// fromArrayLike(users).pipe(
//     single({ predicate: user => user.id === 1 })
// ).subscribe(user => console.log('Found user:', user.name)); // 'Alice'

// // Async single
// fromArrayLike([42]).pipe(
//     single({
//         scheduler: asyncScheduler,
//         delay: 500
//     })
// ).subscribe(value => console.log('Async single:', value));

// // 4. toArray examples
// console.log('\n=== toArray Examples ===');

// // Basic collection
// fromArrayLike([1, 2, 3]).pipe(
//     toArray()
// ).subscribe(arr => console.log('Collected array:', arr)); // [1, 2, 3]

// // With transformation
// fromArrayLike([1, 2, 3]).pipe(
//     toArray({
//         mapFn: x => x * 2,
//         filterFn: x => x > 2
//     })
// ).subscribe(arr => console.log('Transformed array:', arr)); // [4, 6]

// // With max count
// fromArrayLike([1, 2, 3, 4, 5]).pipe(
//     toArray({ maxCount: 3 })
// ).subscribe(arr => console.log('Limited array:', arr)); // [1, 2, 3]

// // Async emission
// fromArrayLike([1, 2, 3]).pipe(
//     toArray({
//         scheduler: asyncScheduler,
//         delay: 1000
//     })
// ).subscribe(arr => console.log('Delayed array:', arr));

// // Memory efficient with initial capacity
// const largeSource = new Observable<number>(observer => {
//     for (let i = 0; i < 1000000; i++) {
//         observer.next(i);
//     }
//     observer.complete();
// });

// largeSource.pipe(
//     toArray({ initialCapacity: 1000000 }) // Pre-allocate for performance
// ).subscribe(arr => {
//     console.log('Large array length:', arr.length);
// });

// // Combined with other operators
// fromArrayLike([1, 2, 3, 4, 5]).pipe(
//     filter(x => x % 2 === 0), // Only even numbers
//     map(x => x * 10), // Multiply by 10
//     toArray()
// ).subscribe(arr => console.log('Processed array:', arr)); // [20, 40]


// // Lazy configuration with defer
// function createApiClient(configUrl: string): Observable<ApiClient> {
//     return defer(() => 
//         fromPromise(fetch(configUrl).then(res => res.json()))
//             .pipe(
//                 map(config => new ApiClient(config))
//             )
//     );
// }

// // Usage - config is only fetched when client is actually used
// const client$ = createApiClient('/api/config');
// client$.subscribe(client => {
//     client.makeRequest('/api/data');
// });

// // Safe single with default
// function getSingleOrFallback<T>(
//     source$: Observable<T>,
//     fallback: T
// ): Observable<T> {
//     return source$.pipe(
//         single({ defaultValue: fallback }),
//         catchError(() => of(fallback))
//     );
// }

// // Usage
// const user$ = getUserById(123);
// getSingleOrFallback(user$, { id: 0, name: 'Unknown' })
//     .subscribe(user => console.log('User:', user));

// // Batch processing with toArray
// function processInBatches<T>(
//     source$: Observable<T>,
//     batchSize: number,
//     processBatch: (batch: T[]) => Promise<void>
// ): Observable<void> {
//     return source$.pipe(
//         toArray({ maxCount: batchSize }),
//         mergeMap(batch => fromPromise(processBatch(batch))),
//         toArray(), // Collect all batch results
//         map(() => void 0)
//     );
// }

// // Usage
// const data$ = fromArrayLike([/* large dataset */]);
// processInBatches(data$, 1000, async (batch) => {
//     await saveToDatabase(batch);
// }).subscribe(() => console.log('All batches processed'));

// // Retry with exponential backoff using defer
// function withRetry<T>(
//     factory: () => Observable<T>,
//     maxRetries: number,
//     baseDelay: number = 1000
// ): Observable<T> {
//     return defer(() => factory()).pipe(
//         retryWhen(errors => errors.pipe(
//             mergeMap((error, attempt) => {
//                 if (attempt >= maxRetries) {
//                     throw error;
//                 }
//                 const delay = baseDelay * Math.pow(2, attempt);
//                 return timer(delay);
//             })
//         ))
//     );
// }

// // Error recovery pipeline
// function robustDataSource<T>(
//     primarySource: () => Observable<T>,
//     fallbackSource: () => Observable<T>
// ): Observable<T> {
//     return defer(primarySource).pipe(
//         throwIfEmpty({
//             errorFactory: () => new Error('Primary source empty')
//         }),
//         catchError(() => defer(fallbackSource)),
//         single({ defaultValue: null as any }),
//         filter((value): value is T => value !== null)
//     );
// }



// mix max ===========>
// 1. delay examples
// console.log('=== delay Examples ===');

// // Fixed delay
// fromArrayLike([1, 2, 3]).pipe(
//     delay({ delay: 1000 })
// ).subscribe(value => {
//     console.log(`Delayed value at ${Date.now()}:`, value);
// });

// // Dynamic delay based on value
// fromArrayLike([1, 5, 10]).pipe(
//     delay({ delay: value => value * 100 })
// ).subscribe(value => {
//     console.log(`Value ${value} delayed by ${value * 100}ms`);
// });

// // Delay errors
// const errorSource = new Observable<number>(observer => {
//     observer.next(1);
//     observer.error(new Error('Test error'));
// });

// errorSource.pipe(
//     delay({ 
//         delay: 1000,
//         errorStrategy: 'delay'
//     })
// ).subscribe({
//     next: v => console.log('Value:', v),
//     error: e => console.log('Delayed error:', e.message)
// });

// // 2. first examples
// console.log('\n=== first Examples ===');

// // First value
// fromArrayLike([10, 20, 30]).pipe(
//     first()
// ).subscribe(value => console.log('First value:', value)); // 10

// // First matching predicate
// fromArrayLike([1, 2, 3, 4, 5]).pipe(
//     first({ predicate: x => x > 3 })
// ).subscribe(value => console.log('First > 3:', value)); // 4

// // First with default value
// empty().pipe(
//     first({ defaultValue: 'default' })
// ).subscribe(value => console.log('First or default:', value)); // 'default'

// // First index
// fromArrayLike(['a', 'b', 'c']).pipe(
//     first({ emitIndex: true })
// ).subscribe(index => console.log('First index:', index)); // 0

// // 3. find examples
// console.log('\n=== find Examples ===');

// // Find first even number
// fromArrayLike([1, 3, 5, 6, 7, 8]).pipe(
//     find({ predicate: x => x % 2 === 0 })
// ).subscribe(value => console.log('First even:', value)); // 6

// // Find with default value
// fromArrayLike([1, 3, 5]).pipe(
//     find({ 
//         predicate: x => x % 2 === 0,
//         defaultValue: -1
//     })
// ).subscribe(value => console.log('First even or -1:', value)); // -1

// // Find index
// fromArrayLike(['apple', 'banana', 'cherry']).pipe(
//     find({ 
//         predicate: fruit => fruit.startsWith('b'),
//         emitIndex: true
//     })
// ).subscribe(index => console.log('Index of fruit starting with b:', index)); // 1

// // 4. findIndex examples
// console.log('\n=== findIndex Examples ===');

// // Find index of first even number
// fromArrayLike([1, 3, 5, 6, 7, 8]).pipe(
//     findIndex({ predicate: x => x % 2 === 0 })
// ).subscribe(index => console.log('Index of first even:', index)); // 3

// // Find index with custom default
// fromArrayLike([1, 3, 5]).pipe(
//     findIndex({ 
//         predicate: x => x % 2 === 0,
//         defaultValue: -999
//     })
// ).subscribe(index => console.log('Index or default:', index)); // -999

// // 5. min examples
// console.log('\n=== min Examples ===');

// // Simple min
// fromArrayLike([5, 2, 8, 1, 9]).pipe(
//     min()
// ).subscribe(value => console.log('Min value:', value)); // 1

// // Min with comparator
// fromArrayLike(['apple', 'banana', 'cherry']).pipe(
//     min({ comparator: (a, b) => a.length - b.length })
// ).subscribe(value => console.log('Shortest string:', value)); // 'apple'

// // Min with key selector
// interface Product { name: string; price: number; }
// const products: Product[] = [
//     { name: 'Laptop', price: 1000 },
//     { name: 'Phone', price: 800 },
//     { name: 'Tablet', price: 600 }
// ];

// fromArrayLike(products).pipe(
//     min({ keySelector: p => p.price })
// ).subscribe(product => {
//     console.log('Cheapest product:', product?.name, product?.price);
// }); // { name: 'Tablet', price: 600 }

// // Min index
// fromArrayLike([30, 10, 50, 20]).pipe(
//     min({ emitIndex: true })
// ).subscribe(index => console.log('Index of min value:', index)); // 1

// // 6. max examples
// console.log('\n=== max Examples ===');

// // Simple max
// fromArrayLike([5, 2, 8, 1, 9]).pipe(
//     max()
// ).subscribe(value => console.log('Max value:', value)); // 9

// // Max with comparator
// fromArrayLike(['apple', 'banana', 'cherry']).pipe(
//     max({ comparator: (a, b) => a.length - b.length })
// ).subscribe(value => console.log('Longest string:', value)); // 'banana'

// // Max with key selector
// fromArrayLike(products).pipe(
//     max({ keySelector: p => p.price })
// ).subscribe(product => {
//     console.log('Most expensive product:', product?.name, product?.price);
// }); // { name: 'Laptop', price: 1000 }

// // Max index
// fromArrayLike([30, 10, 50, 20]).pipe(
//     max({ emitIndex: true })
// ).subscribe(index => console.log('Index of max value:', index)); // 2
// Debounce-like behavior with dynamic delay
// function debounceTime<T>(dueTime: number): OperatorFunction<T, T> {
//     return source => source.pipe(
//         delay({ 
//             resetOnEmit: true,
//             delay: dueTime
//         })
//     );
// }

// // Usage
// fromEvent(document, 'scroll').pipe(
//     debounceTime(100)
// ).subscribe(() => {
//     console.log('Scrolled (debounced)');
// });

// // Find minimum with custom comparator
// interface Point { x: number; y: number; }
// const points: Point[] = [
//     { x: 1, y: 2 },
//     { x: 3, y: 1 },
//     { x: 2, y: 3 }
// ];

// // Find point closest to origin
// fromArrayLike(points).pipe(
//     min({
//         comparator: (a, b) => a - b,
//         keySelector: (p: Point) => Math.sqrt(p.x * p.x + p.y * p.y)
//     })
// ).subscribe(closest => {
//     console.log('Closest to origin:', closest);
// });

// // Race condition: first value from multiple sources
// function race<T>(...sources: Observable<T>[]): Observable<T> {
//     return new Observable(observer => {
//         const subscriptions: Subscription[] = [];
        
//         sources.forEach(source => {
//             const sub = source.pipe(
//                 first()
//             ).subscribe({
//                 next: value => {
//                     // Unsubscribe all other sources
//                     subscriptions.forEach(s => s.unsubscribe());
//                     observer.next(value);
//                     observer.complete();
//                 },
//                 error: err => observer.error(err)
//             });
            
//             subscriptions.push(sub);
//         });
        
//         return () => subscriptions.forEach(s => s.unsubscribe());
//     });
// }

// // Find first matching value across multiple criteria
// function findFirstMatch<T>(
//     source$: Observable<T>,
//     predicates: Array<(value: T, index: number) => boolean>
// ): Observable<{ value: T; index: number; predicateIndex: number }> {
//     return source$.pipe(
//         mergeMap((value, index) => {
//             for (let i = 0; i < predicates.length; i++) {
//                 if (predicates[i](value, index)) {
//                     return of({ value, index, predicateIndex: i });
//                 }
//             }
//             return EMPTY;
//         }),
//         first()
//     );
// }

// // Delay with exponential backoff for retries
// function delayWithBackoff<T>(
//     initialDelay: number,
//     maxDelay: number = 30000
// ): OperatorFunction<T, T> {
//     let attempt = 0;
    
//     return source => source.pipe(
//         delay({
//             delay: () => {
//                 const delay = Math.min(
//                     initialDelay * Math.pow(2, attempt),
//                     maxDelay
//                 );
//                 attempt++;
//                 return delay;
//             },
//             resetOnEmit: true
//         })
//     );
// }

// // Usage in retry logic
// fromPromise(fetch('/api')).pipe(
//     retryWhen(errors => errors.pipe(
//         delayWithBackoff(1000, 10000),
//         take(5)
//     ))
// ).subscribe(console.log);
// mix max ===========>



// // 1. delayWhen examples
// console.log('=== delayWhen Examples ===');

// // Delay each value by different amount
// fromArrayLike([100, 200, 300]).pipe(
//     delayWhen(value => timer(value)) // Longer values get longer delays
// ).subscribe(value => {
//     console.log(`Value ${value} delayed by ${value}ms`);
// });

// // Reset on emit (debounce behavior)
// const clicks$ = fromEvent(document, 'click');
// clicks$.pipe(
//     delayWhen(() => timer(1000), { resetOnEmit: true })
// ).subscribe(() => {
//     console.log('Clicked after 1 second of inactivity');
// });

// // Promise-based delay
// fromArrayLike(['a', 'b', 'c']).pipe(
//     delayWhen(() => new Promise(resolve => setTimeout(resolve, 500)))
// ).subscribe(console.log);

// // 2. materialize/dematerialize examples
// console.log('\n=== materialize/dematerialize Examples ===');

// const source$ = new Observable<number>(observer => {
//     observer.next(1);
//     observer.next(2);
//     observer.error(new Error('Test error'));
//     observer.next(3); // Never emitted
// });

// // Materialize
// source$.pipe(
//     materialize()
// ).subscribe(notification => {
//     switch (notification.kind) {
//         case NotificationKind.NEXT:
//             console.log('Value:', notification.value);
//             break;
//         case NotificationKind.ERROR:
//             console.log('Error:', notification.error?.message);
//             break;
//         case NotificationKind.COMPLETE:
//             console.log('Complete');
//             break;
//     }
// });

// // Round trip
// source$.pipe(
//     materialize(),
//     // Operate on notifications
//     map(notification => {
//         if (notification.kind === NotificationKind.NEXT) {
//             return {
//                 ...notification,
//                 value: (notification.value || 0) * 2
//             };
//         }
//         return notification;
//     }),
//     dematerialize()
// ).subscribe({
//     next: v => console.log('Dematerialized:', v),
//     error: e => console.log('Dematerialized error:', e.message)
// });

// // 3. groupBy examples
// console.log('\n=== groupBy Examples ===');

// // Group by first letter
// const words = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'];
// fromArrayLike(words).pipe(
//     groupBy(word => word[0])
// ).subscribe(group$ => {
//     console.log(`Group ${group$.key}:`);
//     group$.subscribe(word => console.log(`  ${word}`));
// });

// // Group with element selector
// interface Person { name: string; age: number; }
// const people: Person[] = [
//     { name: 'Alice', age: 25 },
//     { name: 'Bob', age: 30 },
//     { name: 'Charlie', age: 25 },
//     { name: 'Diana', age: 30 }
// ];

// fromArrayLike(people).pipe(
//     groupBy(
//         person => person.age,
//         { elementSelector: person => person.name }
//     )
// ).subscribe(group$ => {
//     console.log(`Age ${group$.key}:`);
//     group$.pipe(toArray()).subscribe(names => {
//         console.log(`  Names: ${names.join(', ')}`);
//     });
// });

// // Group with duration selector
// const hotKeys$ = fromEvent(document, 'keydown').pipe(
//     map(e => (e as KeyboardEvent).key),
//     groupBy(
//         key => key,
//         {
//             durationSelector: group$ => group$.pipe(
//                 debounceTime(1000)
//             )
//         }
//     )
// );

// hotKeys$.subscribe(group$ => {
//     console.log(`Key ${group$.key} pressed:`);
//     group$.subscribe(key => {
//         console.log(`  ${new Date().toISOString()}: ${key}`);
//     });
// });

// // 4. debounce examples
// console.log('\n=== debounce Examples ===');

// // Simple debounce
// const input$ = fromEvent(searchInput, 'input');
// input$.pipe(
//     debounce(() => 300)
// ).subscribe(() => {
//     console.log('Search after 300ms of inactivity');
// });

// // Dynamic debounce
// const fastClicks$ = fromEvent(button, 'click');
// fastClicks$.pipe(
//     debounce((event, index) => index < 5 ? 100 : 500)
// ).subscribe(() => {
//     console.log('Debounced click');
// });

// // Leading debounce
// interval(100).pipe(
//     take(10),
//     debounce(() => 200, { leading: true })
// ).subscribe(value => {
//     console.log('Leading debounce:', value); // 0 immediately, then debounced
// });

// // 5. count examples
// console.log('\n=== count Examples ===');

// // Count all values
// fromArrayLike([1, 2, 3, 4, 5]).pipe(
//     count()
// ).subscribe(total => console.log('Total:', total)); // 5

// // Count with predicate
// fromArrayLike([1, 2, 3, 4, 5]).pipe(
//     count({ predicate: x => x % 2 === 0 })
// ).subscribe(evenCount => console.log('Even count:', evenCount)); // 2

// // Emit at specific count
// interval(100).pipe(
//     count({ emitAt: 5 })
// ).subscribe(count => {
//     console.log(`Reached ${count} emissions`);
// }); // Emits 5 and completes

// // 6. every examples
// console.log('\n=== every Examples ===');

// // Check if all values are positive
// fromArrayLike([1, 2, 3, 4]).pipe(
//     every(x => x > 0)
// ).subscribe(allPositive => {
//     console.log('All positive?', allPositive); // true
// });

// // Early termination
// fromArrayLike([2, 4, 6, 7, 8]).pipe(
//     every(x => x % 2 === 0)
// ).subscribe(allEven => {
//     console.log('All even?', allEven); // false (stops at 7)
// });

// // Empty sequence
// empty().pipe(
//     every(() => false)
// ).subscribe(result => {
//     console.log('Empty sequence result:', result); // true (default)
// });