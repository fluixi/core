import type { Selector, SelectorOptions, SelectorSegment, SelectorType } from './types.js';
/**
 * Enhanced selector string parsing with multiple notations
 * @param selector - Selector string
 * @param options - Parsing options
 * @returns Array of selector segments
 * @example
 * parseSelector('users[0].name') // [{type: 'property', value: 'users'}, {type: 'index', value: 0}, ...]
 */
export declare const parseSelector: (selector: string, options?: SelectorOptions) => SelectorSegment[];
/**
 * Creates a filter function from expression string
 * @param expr - Filter expression (e.g., '@.age > 18')
 * @returns Filter function
 */
export declare const createFilterFunction: (expr: string) => ((item: any) => boolean);
/**
 * Stringifies selector segments back to string
 */
export declare const stringifySelector: (segments: SelectorSegment[]) => string;
/**
 * Checks if selector matches type signature
 */
export declare const validateSelector: (selector: Selector, options?: {
    allowedTypes?: SelectorType[];
}) => {
    valid: boolean;
    error?: string;
    type?: SelectorType;
} | {
    valid: boolean;
    error?: string;
    type?: SelectorType;
}[];
/**
 * Detects selector type from string
 */
export declare const detectSelectorType: (selector: string) => SelectorType;
/**
 * Creates a selector from a template
 * @param template - Template string
 * @param replacements - Replacements object
 * @example
 * createSelector('a.{id}', {id: 1}) // 'a.1'
 * createSelector('a.{id}.{name}', {id: 1, name: 'John'}) // 'a.1.John'
 * createSelector('a.{id}.{name}.{age}', {id: 1, name: 'John', age: 30}) // 'a.1.John.30'
 * createSelector('users[{id}].{property}', {id: 1}) // 'users[1].property'
 */
export declare const createSelector: (template: string, replacements: Record<string, string | number>) => string;
//# sourceMappingURL=selector.d.ts.map