/**
 * Enhanced selector string parsing with multiple notations
 * @param selector - Selector string
 * @param options - Parsing options
 * @returns Array of selector segments
 * @example
 * parseSelector('users[0].name') // [{type: 'property', value: 'users'}, {type: 'index', value: 0}, ...]
 */
export const parseSelector = (selector, options = {}) => {
    const { type = 'auto', throwOnError = false } = options;
    if (!selector || typeof selector !== 'string') {
        return [];
    }
    const segments = [];
    let current = '';
    let inBrackets = false;
    let inQuotes = false;
    let quoteChar = '';
    let bracketContent = '';
    let bracketDepth = 0;
    const detectType = (str) => {
        if (str.includes('..'))
            return 'descendant';
        if (str.includes('[?('))
            return 'filter';
        if (str.includes('[:') || str.includes('[0:'))
            return 'slice';
        if (str.includes('[,') || str.includes('[0,1]'))
            return 'union';
        if (str.includes('[*]') || str.includes('.*.'))
            return 'wildcard';
        if (str.includes('[]'))
            return 'array-wildcard';
        if (str.includes('[') && str.includes(']'))
            return 'bracket';
        return 'dot';
    };
    const actualType = type === 'auto' ? detectType(selector) : type;
    const parseBracketContent = (content) => {
        const trimmed = content.trim();
        // Wildcard
        if (trimmed === '*' || trimmed === '') {
            return {
                type: 'wildcard',
                value: trimmed === '' ? '[]' : '*',
                raw: trimmed === '' ? '[]' : content,
            };
        }
        // Array wildcard
        if (trimmed === '[]') {
            return { type: 'wildcard', value: '[]', raw: content };
        }
        // Numeric index
        if (/^-?\d+$/.test(trimmed)) {
            return { type: 'index', value: parseInt(trimmed, 10), raw: content };
        }
        // Slice notation [start:end:step] or [start:end]
        if (trimmed.includes(':')) {
            const parts = trimmed.split(':').map((p) => p.trim());
            const start = parts[0] === '' ? 0 : parseInt(parts[0], 10);
            const end = parts[1] === '' ? Infinity : parseInt(parts[1], 10);
            if (isNaN(start) || isNaN(end)) {
                if (throwOnError)
                    throw new Error(`Invalid slice notation: ${content}`);
                return { type: 'wildcard', value: '*', raw: content };
            }
            return { type: 'slice', value: [start, end], raw: content };
        }
        // Union notation [0,2,4]
        if (trimmed.includes(',')) {
            const indices = trimmed
                .split(',')
                .map((p) => {
                const num = parseInt(p.trim(), 10);
                return isNaN(num) ? -1 : num;
            })
                .filter((n) => n >= 0);
            if (indices.length === 0) {
                if (throwOnError)
                    throw new Error(`Invalid union notation: ${content}`);
                return { type: 'wildcard', value: '*', raw: content };
            }
            return { type: 'union', value: indices, raw: content };
        }
        // Filter notation [?(@.age > 18)]
        if (trimmed.startsWith('?(') && trimmed.endsWith(')')) {
            const expr = trimmed.slice(2, -1);
            try {
                const filterFn = createFilterFunction(expr);
                return { type: 'filter', value: filterFn, raw: content };
            }
            catch (error) {
                if (throwOnError)
                    throw error;
                return { type: 'wildcard', value: '*', raw: content };
            }
        }
        // Quoted property
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return { type: 'property', value: trimmed.slice(1, -1), raw: content };
        }
        // Regular property
        return { type: 'property', value: trimmed, raw: content };
    };
    for (let i = 0; i < selector.length; i++) {
        const char = selector[i];
        const nextChar = selector[i + 1];
        // Handle quotes
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
            // if (inBrackets) {
            //   bracketContent += char;
            // } else {
            //   current += char;
            // }
            continue;
        }
        else if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = '';
            if (!(char === '"' || char === "'")) {
                if (inBrackets) {
                    bracketContent += char;
                }
                else {
                    current += char;
                }
            }
            continue;
        }
        // Inside quotes, just add character
        if (inQuotes) {
            if (inBrackets) {
                bracketContent += char;
            }
            else {
                current += char;
            }
            continue;
        }
        // Handle bracket start
        if (char === '[' && !inBrackets) {
            if (current) {
                segments.push({ type: 'property', value: current, raw: current });
                current = '';
            }
            inBrackets = true;
            bracketContent = '';
            continue;
        }
        // Handle bracket end
        if (char === ']' && inBrackets && !inQuotes) {
            inBrackets = false;
            const segment = parseBracketContent(bracketContent);
            segments.push(segment);
            continue;
        }
        let lastDot = segments.length > 0 ? segments[segments.length - 1] : null;
        // Handle dots
        if (char === '.' && !inBrackets && !inQuotes) {
            // Check for descendant selector (..)
            if (nextChar === '.') {
                // lastDot = true
                const l = selector.split('..')[0];
                segments.push({ type: 'property', value: l, raw: l });
                segments.push({ type: 'descendant', value: '..', raw: '..' });
                i++; // Skip next dot
            }
            else if (current) {
                if (current === '*') {
                    segments.push({ type: 'wildcard', value: current, raw: current });
                }
                else {
                    segments.push({ type: 'property', value: current, raw: current });
                }
                current = '';
            }
            continue;
        }
        // Add character to current buffer
        if (inBrackets) {
            bracketContent += char;
        }
        else {
            if (lastDot && lastDot.type !== 'descendant') {
                current += char;
            }
            else {
                const l = selector.split(lastDot?.raw)[1];
                if (l !== undefined) {
                    // current = l;
                    current = l;
                }
                else {
                    current += char;
                }
            }
        }
    }
    if (current) {
        segments.push({ type: 'property', value: current, raw: current });
    }
    // console.log('checking for last', segments);
    // Convert numeric strings in property segments
    return segments.map((segment) => {
        if (segment.type === 'property' && typeof segment.value === 'string') {
            if (/^-?\d+$/.test(segment.value)) {
                const num = parseInt(segment.value, 10);
                if (!isNaN(num)) {
                    // return { ...segment, type: 'property', value: String(num) };
                    return { ...segment, type: 'index', value: num };
                }
            }
        }
        return segment;
    });
};
/**
 * Creates a filter function from expression string
 * @param expr - Filter expression (e.g., '@.age > 18')
 * @returns Filter function
 */
export const createFilterFunction = (expr) => {
    // Simple expression parser
    // Supports: @.property, comparisons, logical operators
    const safeExpr = expr
        .replace(/@\.([a-zA-Z_$][\w$]*)/g, (_, prop) => `item.${prop}`)
        .replace(/@/g, 'item');
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        return new Function('item', `return ${safeExpr}`);
    }
    catch (error) {
        throw new Error(`Invalid filter expression: ${expr}`);
    }
};
/**
 * Stringifies selector segments back to string
 */
export const stringifySelector = (segments) => {
    const parts = [];
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const prevSegment = i > 0 ? segments[i - 1] : null;
        switch (segment.type) {
            case 'property':
                // Check if property needs quotes
                const needsQuotes = /[\.\[\]\s]/.test(String(segment.value));
                if (needsQuotes) {
                    parts.push(`["${segment.value}"]`);
                }
                else {
                    if (prevSegment && prevSegment.type !== 'descendant') {
                        parts.push('.');
                    }
                    parts.push(String(segment.value));
                }
                break;
            case 'index':
                parts.push(`[${segment.value}]`);
                break;
            case 'wildcard':
                if (segment.value === '[]') {
                    parts.push('[]');
                }
                else {
                    parts.push('[*]');
                }
                break;
            case 'slice':
                const [start, end] = segment.value;
                parts.push(`[${start}:${end === Infinity ? '' : end}]`);
                break;
            case 'union':
                const indices = segment.value;
                parts.push(`[${indices.join(',')}]`);
                break;
            case 'filter':
                parts.push(`[?(${segment.raw?.slice(2, -1) || ''})]`);
                break;
            case 'descendant':
                parts.push('..');
                break;
        }
    }
    return parts.join('').replace(/\.\[/g, '[');
};
/**
 * Checks if selector matches type signature
 */
export const validateSelector = (selector, options = {}) => {
    // Handle array of selectors
    if (Array.isArray(selector)) {
        return selector.map((sel) => validateSelector(sel, options));
    }
    //check if selector starts with alphabet
    if (!/^[a-zA-Z]/.test(selector)) {
        return {
            valid: false,
            error: `Selector starts with '.'`,
            type: detectSelectorType(selector),
        };
    }
    //check if selector ends with alphabet
    if (!/[a-zA-Z]$/.test(selector)) {
        return {
            valid: false,
            error: `Selector end with '.'`,
            type: detectSelectorType(selector),
        };
    }
    try {
        const segments = parseSelector(selector, { throwOnError: true });
        const type = detectSelectorType(selector);
        // console.log('validate', segments, type);
        if (options.allowedTypes) {
            if (!options.allowedTypes.includes(type)) {
                return {
                    valid: false,
                    error: `Selector type ${type} not allowed. Allowed: ${options.allowedTypes.join(', ')}`,
                    type,
                };
            }
        }
        return { valid: true, type: detectSelectorType(selector) };
    }
    catch (error) {
        return { valid: false, error: error.message };
    }
};
/**
 * Detects selector type from string
 */
export const detectSelectorType = (selector) => {
    if (selector.includes('..'))
        return 'descendant';
    if (selector.includes('[?('))
        return 'filter';
    if (selector.includes('[:') || selector.includes('[0:'))
        return 'slice';
    // we need regex to test union but the actually regex catch brackets
    if (/\[[^\]]*,[^\]]*\]/.test(selector))
        return 'union';
    if (selector.includes('[*]') || selector.includes('.*.'))
        return 'wildcard';
    if (selector.includes('[]'))
        return 'array-wildcard';
    if (selector.includes('[') && selector.includes(']'))
        return 'bracket';
    return 'dot';
};
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
export const createSelector = (template, replacements) => {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        if (key in replacements) {
            return String(replacements[key]);
        }
        return `{${key}}`;
    });
};
