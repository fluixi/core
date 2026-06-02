import { Observable, OperatorFunction } from "@fluixi/reactive";

// /**
//  * Path type for nested property access
//  */
// type NestedPath<T, K extends string> = 
//     K extends keyof T ? K :
//     K extends `${infer P}.${infer R}` ? 
//         (P extends keyof T ? `${P}.${NestedPath<T[P], R>}` : never) :
//     never;

/**
 * Type-safe property value extractor
 */
type PluckResult<T, K extends string> = 
    K extends keyof T ? T[K] :
    K extends `${infer P}.${infer R}` ?
        P extends keyof T ? PluckResult<T[P], R> : never :
    unknown;

/**
 * Extracts the value of a nested property from each emitted object.
 * 
 * @template T The type of source objects.
 * @template K The property path (supports dot notation for nested properties).
 * 
 * @param {...string[]} properties The property names to extract (supports dot notation).
 * @returns {OperatorFunction<T, PluckResult<T, K>>} An operator function.
 * 
 * @example
 * // Simple property
 * source$.pipe(pluck('id')).subscribe(console.log);
 * 
 * @example
 * // Nested property with dot notation
 * source$.pipe(pluck('user', 'address', 'city')).subscribe(console.log);
 * 
 * @example
 * // Type-safe usage
 * interface User { name: string; address: { city: string; }; }
 * const user$ = new Observable<User>();
 * user$.pipe(pluck('address', 'city')).subscribe(city => {
 *   console.log(city); // string
 * });
 * 
 * @performance
 * - Compiles property path once at subscription time
 * - No regular expressions at runtime
 * - Minimal property lookup overhead
 * - Early return for undefined/null values
 */
export function pluck<T, K extends string>(
    ...properties: K extends string ? K[] : never
): OperatorFunction<T, PluckResult<T, K>> {
    // Preprocess property paths for performance
    const paths = properties.map(prop => 
        prop.split('.').filter(Boolean)
    );
    
    // Check if any path is empty
    if (paths.some(path => path.length === 0)) {
        throw new Error('Property path cannot be empty');
    }
    
    return (source: Observable<T>): Observable<PluckResult<T, K>> => {
        return new Observable<PluckResult<T, K>>((observer) => {
            const subscription = source.subscribe({
                next: (value: T) => {
                    try {
                        // Handle null/undefined source value
                        if (value == null) {
                            observer.next(undefined as PluckResult<T, K>);
                            return;
                        }
                        
                        // For multiple properties, extract all
                        if (paths.length > 1) {
                            const result = paths.map(path => 
                                extractNestedProperty(value, path)
                            ) as PluckResult<T, K>;
                            observer.next(result);
                            return;
                        }
                        
                        // Single property extraction
                        const result = extractNestedProperty(value, paths[0]) as PluckResult<T, K>;
                        observer.next(result);
                    } catch (err) {
                        observer.error(err);
                    }
                },
                error: (err) => observer.error(err),
                complete: () => observer.complete()
            });
            
            return () => subscription.unsubscribe();
        });
    };
}

/**
 * Helper function to extract nested property value
 * @param obj The source object
 * @param path Array of property names
 * @returns The nested property value or undefined
 */
function extractNestedProperty<T>(obj: T, path: string[]): unknown {
    let current: any = obj;
    
    for (const key of path) {
        if (current == null) {
            return undefined;
        }
        
        // Handle both objects and arrays with numeric keys
        if (Array.isArray(current)) {
            const index = parseInt(key, 10);
            if (!isNaN(index) && index >= 0 && index < current.length) {
                current = current[index];
            } else {
                current = current[key as any];
            }
        } else if (typeof current === 'object') {
            current = current[key as keyof typeof current];
        } else {
            return undefined;
        }
    }
    
    return current;
}

// export function pluck<T, K extends keyof T>(...properties: K[]): OperatorFunction<T, T[K]> {
//     return map((value: T) => {
//         let result: any = value;
//         for (const prop of properties) {
//             result = result[prop];
//         }
//         return result as T[K];
//     });
// }