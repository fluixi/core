// type ParserOptions = {
//   allowUnquotedKeys?: boolean;
//   allowTrailingCommas?: boolean;
//   allowSingleQuotes?: boolean;
//   allowComments?: boolean;
//   allowUndefined?: boolean;
//   allowSpecialNumbers?: boolean;
//   reviver?: (key: string, value: any) => any;
//   strict?: boolean;
//   maxDepth?: number;
// };

// class ParseError extends Error {
//   constructor(
//     message: string,
//     public position: number,
//     public context: string = ''
//   ) {
//     super(`ParseError at position ${position}: ${message}${context ? ` (${context})` : ''}`);
//     this.name = 'ParseError';
//   }
// }

// /**
//  * Safe, typed parser for JavaScript object literals
//  */
// export function parseObjectString<T = any>(str: string, options: ParserOptions = {}): T {
//   // Input validation
//   if (typeof str !== 'string') {
//     throw new TypeError('Input must be a string');
//   }

//   if (str.trim().length === 0) {
//     throw new ParseError('Input string is empty', 0);
//   }

//   // Default options
//   const opts: Required<ParserOptions> = {
//     allowUnquotedKeys: true,
//     allowTrailingCommas: true,
//     allowSingleQuotes: true,
//     allowComments: true,
//     allowUndefined: false,
//     allowSpecialNumbers: false,
//     reviver: undefined!,
//     strict: false,
//     maxDepth: 100,
//     ...options,
//   };

//   let index = 0;
//   let currentChar = str[0] || '';

//   // Helper functions
//   const next = (): void => {
//     index++;
//     currentChar = str[index] || '';
//   };

//   const peek = (offset = 1): string => str[index + offset] || '';

//   const isEnd = (): boolean => index >= str.length;

//   const expectChar = (char: string, errorMessage: string): void => {
//     if (currentChar !== char) {
//       throw new ParseError(errorMessage, index, `Expected '${char}', got '${currentChar}'`);
//     }
//   };

//   // Skip functions
//   const skipWhitespace = (): void => {
//     while (!isEnd() && /\s/.test(currentChar)) {
//       next();
//     }
//   };

//   const skipComments = (): void => {
//     if (!opts.allowComments) return;

//     // Single line comment
//     if (currentChar === '/' && peek() === '/') {
//       next(); // Skip '/'
//       next(); // Skip second '/'
//       while (!isEnd() && (peek() !== '\n' && peek() !== '\r')) {
//       // while (!isEnd() && currentChar !== '\n' && currentChar !== '\r') {
//         next();
//       }
//       skipWhitespace();
//     }

//     // Multi-line comment
//     if (currentChar === '/' && peek() === '*') {
//       next(); // Skip '/'
//       next(); // Skip '*'
//       while (!isEnd()) {
//         if (peek() === '/') {
//         // if (currentChar === '*' && peek() === '/') {
//           next(); // Skip '*'
//           next(); // Skip '/'
//           break;
//         }
//         next();
//       }
//       skipWhitespace();
//     }
//   };

//   const skipWhitespaceAndComments = (): void => {
//     while (!isEnd()) {
//       const prevIndex = index;
//       skipWhitespace();
//       skipComments();
//       if (index === prevIndex) break;
//     }
//   };

//   // Character classification helpers
//   const isDigit = (char: string): boolean => char >= '0' && char <= '9';
//   const isHexDigit = (char: string): boolean => 
//     (char >= '0' && char <= '9') || 
//     (char >= 'a' && char <= 'f') || 
//     (char >= 'A' && char <= 'F');
//   const isIdentifierStart = (char: string): boolean => 
//     (char >= 'a' && char <= 'z') || 
//     (char >= 'A' && char <= 'Z') || 
//     char === '_' || 
//     char === '$';
//   const isIdentifierChar = (char: string): boolean => 
//     isIdentifierStart(char) || isDigit(char);

//   // Main parse function with depth tracking
//   const parseValue = (depth = 0): any => {
//     if (depth > opts.maxDepth) {
//       throw new ParseError(`Maximum nesting depth (${opts.maxDepth}) exceeded`, index);
//     }

//     skipWhitespaceAndComments();

//     if (isEnd()) {
//       throw new ParseError('Unexpected end of input', index);
//     }

//     switch (currentChar) {
//       case '{':
//         return parseObject(depth + 1);
//       case '[':
//         return parseArray(depth + 1);
//       case '"':
//       case "'":
//         return parseString();
//       case '-':
//       case '0':
//       case '1':
//       case '2':
//       case '3':
//       case '4':
//       case '5':
//       case '6':
//       case '7':
//       case '8':
//       case '9':
//         return parseNumber();
//       case 't':
//       case 'f':
//       case 'n':
//         return parseKeyword();
//       case 'u':
//         if (opts.allowUndefined) {
//           return parseKeyword();
//         }
//         throw new ParseError('Unexpected character', index, "'u' at start of undefined");
//       case 'I':
//       case 'N':
//         if (opts.allowSpecialNumbers) {
//           return parseSpecialNumber();
//         }
//         throw new ParseError('Unexpected character', index);
//       default:
//         throw new ParseError(`Unexpected character '${currentChar}'`, index);
//     }
//   };

//   const parseObject = (depth: number): Record<string, any> => {
//     const obj: Record<string, any> = {};
//     next(); // Skip '{'
    
//     skipWhitespaceAndComments();

//     // Empty object
//     if (currentChar === '}') {
//       next();
//       return obj;
//     }

//     while (!isEnd()) {
//       skipWhitespaceAndComments();

//       // Parse key
//       let key: string;
//       if (currentChar === '"' || (opts.allowSingleQuotes && currentChar === "'")) {
//         key = parseString();
//       } else if (opts.allowUnquotedKeys && isIdentifierStart(currentChar)) {
//         const start = index;
//         while (!isEnd() && isIdentifierChar(currentChar)) {
//           next();
//         }
//         key = str.slice(start, index);
//       } else {
//         throw new ParseError('Expected property name', index);
//       }

//       skipWhitespaceAndComments();

//       // Colon
//       expectChar(':', 'Expected colon after property name');
//       next();

//       skipWhitespaceAndComments();

//       // Value
//       obj[key] = parseValue(depth);

//       skipWhitespaceAndComments();

//       // Check for end or comma
//       if (currentChar === '}') {
//         next();
//         break;
//       }

//       if (currentChar === ',') {
//         next();
//         skipWhitespaceAndComments();
        
//         // Check for trailing comma
//         // if (currentChar === '}') {
//         if (peek() === '}') {
//           if (opts.allowTrailingCommas) {
//             next();
//             break;
//           }
//           throw new ParseError('Trailing comma not allowed', index);
//         }
//         continue;
//       }

//       throw new ParseError('Expected comma or closing brace', index);
//     }

//     return obj;
//   };

//   const parseArray = (depth: number): any[] => {
//     const arr: any[] = [];
//     next(); // Skip '['
    
//     skipWhitespaceAndComments();

//     // Empty array
//     if (currentChar === ']') {
//       next();
//       return arr;
//     }

//     while (!isEnd()) {
//       arr.push(parseValue(depth));

//       skipWhitespaceAndComments();

//       // Check for end or comma
//       if (currentChar === ']') {
//         next();
//         break;
//       }

//       if (currentChar === ',') {
//         next();
//         skipWhitespaceAndComments();
        
//         // Trailing comma check
//         if (peek() === ']') {
//         // if (currentChar === ']') {
//           if (opts.allowTrailingCommas) {
//             next();
//             break;
//           }
//           throw new ParseError('Trailing comma not allowed', index);
//         }
//         continue;
//       }

//       throw new ParseError('Expected comma or closing bracket', index);
//     }

//     return arr;
//   };

//   const parseString = (): string => {
//     const quoteChar = currentChar;
//     if (quoteChar === "'" && !opts.allowSingleQuotes) {
//       throw new ParseError('Single quotes not allowed', index);
//     }

//     next(); // Skip opening quote
//     let result = '';
//     const startIndex = index;

//     while (!isEnd() && currentChar !== quoteChar) {
//       if (currentChar === '\\') {
//         next();
//         if (isEnd()) {
//           throw new ParseError('Unterminated string', startIndex);
//         }
//         result += parseEscapeSequence();
//       } else {
//         result += currentChar;
//         next();
//       }
//     }

//     if (currentChar !== quoteChar) {
//       throw new ParseError('Unterminated string', startIndex);
//     }

//     next(); // Skip closing quote
//     return result;
//   };

//   const parseEscapeSequence = (): string => {
//     const escStart = index;
    
//     switch (currentChar) {
//       case '"':
//       case "'":
//       case '\\':
//       case '/':
//         const char = currentChar;
//         next();
//         return char;
//       case 'b':
//         next();
//         return '\b';
//       case 'f':
//         next();
//         return '\f';
//       case 'n':
//         next();
//         return '\n';
//       case 'r':
//         next();
//         return '\r';
//       case 't':
//         next();
//         return '\t';
//       case 'u':
//         next();
//         return parseUnicodeEscape();
//       default:
//         // Return the character as-is (like JavaScript does)
//         const escapedChar = currentChar;
//         next();
//         return escapedChar;
//     }
//   };

//   const parseUnicodeEscape = (): string => {
//     const start = index;
//     let hex = '';
    
//     // Parse 4 hex digits
//     for (let i = 0; i < 4; i++) {
//       if (isEnd() || !isHexDigit(currentChar)) {
//         throw new ParseError('Invalid Unicode escape sequence', start);
//       }
//       hex += currentChar;
//       next();
//     }
    
//     return String.fromCharCode(parseInt(hex, 16));
//   };

//   const parseNumber = (): number => {
//     const start = index;
//     let numberStr = '';

//     // Sign
//     if (currentChar === '-') {
//       numberStr += currentChar;
//       next();
//     }

//     // Integer part
//     if (currentChar === '0') {
//       numberStr += currentChar;
//       next();
//     } else {
//       while (!isEnd() && isDigit(currentChar)) {
//         numberStr += currentChar;
//         next();
//       }
//     }

//     // Fraction part
//     if (currentChar === '.') {
//       numberStr += currentChar;
//       next();
      
//       while (!isEnd() && isDigit(currentChar)) {
//         numberStr += currentChar;
//         next();
//       }
//     }

//     // Exponent
//     if (currentChar === 'e' || currentChar === 'E') {
//       numberStr += currentChar;
//       next();
      
//       // if (currentChar === '+' || currentChar === '-') {
//       if (peek() === '+' || peek() === '-') {
//         numberStr += currentChar;
//         next();
//       }
      
//       while (!isEnd() && isDigit(currentChar)) {
//         numberStr += currentChar;
//         next();
//       }
//     }

//     const num = parseFloat(numberStr);
//     if (isNaN(num)) {
//       throw new ParseError('Invalid number', start);
//     }

//     return num;
//   };

//   const parseSpecialNumber = (): number => {
//     const start = index;
    
//     if (currentChar === 'I') {
//       const word = str.slice(index, index + 8);
//       if (word === 'Infinity') {
//         for (let i = 0; i < 8; i++) next();
//         return Infinity;
//       }
//     } else if (currentChar === 'N') {
//       const word = str.slice(index, index + 3);
//       if (word === 'NaN') {
//         for (let i = 0; i < 3; i++) next();
//         return NaN;
//       }
//     } else if (currentChar === '-' && peek() === 'I') {
//       const word = str.slice(index, index + 9);
//       if (word === '-Infinity') {
//         for (let i = 0; i < 9; i++) next();
//         return -Infinity;
//       }
//     }
    
//     throw new ParseError('Invalid special number', start);
//   };

//   const parseKeyword = (): any => {
//     const start = index;
//     let keyword = '';
    
//     while (!isEnd() && /[a-zA-Z]/.test(currentChar)) {
//       keyword += currentChar;
//       next();
//     }
    
//     switch (keyword) {
//       case 'true':
//         return true;
//       case 'false':
//         return false;
//       case 'null':
//         return null;
//       case 'undefined':
//         if (opts.allowUndefined) {
//           return undefined;
//         }
//         throw new ParseError('undefined is not allowed', start);
//       default:
//         throw new ParseError(`Unexpected keyword '${keyword}'`, start);
//     }
//   };

//   // Main parse execution
//   try {
//     skipWhitespaceAndComments();
//     const result = parseValue();

//     // Check for trailing characters
//     skipWhitespaceAndComments();
//     if (!isEnd()) {
//       throw new ParseError('Unexpected trailing characters', index);
//     }

//     // Apply reviver if provided
//     if (opts.reviver) {
//       return applyReviver({ '': result }, '', result, opts.reviver);
//     }

//     return result as T;
//   } catch (error) {
//     // Fallback to JSON.parse if not strict
//     if (!opts.strict && error instanceof ParseError) {
//       try {
//         return opts.reviver 
//           ? JSON.parse(str, opts.reviver) 
//           : JSON.parse(str);
//       } catch {
//         throw error;
//       }
//     }
//     throw error;
//   }
// }

// function applyReviver(
//   holder: Record<string, any>,
//   key: string,
//   value: any,
//   reviver: (key: string, value: any) => any
// ): any {
//   if (value && typeof value === 'object') {
//     if (Array.isArray(value)) {
//       return value.map((item, index) => 
//         applyReviver(value, index.toString(), item, reviver)
//       );
//     } else {
//       const result: Record<string, any> = {};
//       for (const [k, v] of Object.entries(value)) {
//         const transformed = applyReviver(value, k, v, reviver);
//         if (transformed !== undefined) {
//           result[k] = transformed;
//         }
//       }
//       return result;
//     }
//   }
//   return reviver.call(holder, key, value);
// }





  



/**
 * Fix the regex patterns in the custom parse function
 * Improved version with proper comment handling
 */
function customParse(str: string, options: any = {}): any {
  // First, try to parse as JSON
  try {
    return JSON.parse(str);
  } catch (e) {
    // If JSON.parse fails, attempt to fix common JS object literal issues
    return parseJsObjectLiteral(str, options);
  }
}

function parseJsObjectLiteral(str: string, options: any = {}): any {
  const {
    allowComments = true,
    allowUnquotedKeys = true,
    allowSingleQuotes = true,
    allowTrailingCommas = true,
    allowUndefined = false
  } = options;
  
  let fixed = str.trim();
  
  // 1. Remove comments if allowed
  if (allowComments) {
    // Fix: Proper comment regex that handles multi-line and single-line comments
    // Remove multi-line comments: /* ... */
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove single-line comments: // ... (but not in strings!)
    // We need to be careful not to remove // inside quotes
    // Simple approach: process line by line
    const lines = fixed.split('\n');
    const cleanedLines = lines.map(line => {
      // Find comment position, but ignore // inside quotes
      let inString = false;
      let stringChar = '';
      let escapeNext = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
          stringChar = '';
        } else if (!inString && char === '/' && line[i + 1] === '/') {
          // Found comment start outside string
          return line.substring(0, i);
        }
      }
      
      return line;
    });
    
    fixed = cleanedLines.join('\n');
  }
  
  // 2. Fix unquoted keys (if allowed)
  if (allowUnquotedKeys) {
    // Fix: Better regex that handles edge cases
    // Match property names that are valid identifiers
    // Look for pattern: {key: or ,key: or { key : or , key :
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
  }
  
  // 3. Convert single quotes to double quotes (if allowed)
  if (allowSingleQuotes) {
    // Fix: Better regex that handles escaped quotes
    // Process string literals with single quotes
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escapeNext = false;
    let i = 0;
    
    while (i < fixed.length) {
      const char = fixed[i];
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        result += char;
        i++;
        continue;
      }
      
      if (char === "'" && !inDoubleQuote) {
        if (inSingleQuote) {
          // Closing single quote
          result += '"';
          inSingleQuote = false;
        } else {
          // Opening single quote
          result += '"';
          inSingleQuote = true;
        }
      } else if (char === '"' && !inSingleQuote) {
        if (inDoubleQuote) {
          inDoubleQuote = false;
        } else {
          inDoubleQuote = true;
        }
        result += char;
      } else {
        result += char;
      }
      
      i++;
    }
    
    fixed = result;
  }
  
  // 4. Remove trailing commas (if allowed)
  if (allowTrailingCommas) {
    // Fix: Better regex that handles trailing commas in arrays and objects
    // Remove commas before ] or }
    // Need to avoid removing commas inside strings
    let result = '';
    let inString = false;
    let stringChar = '';
    let escapeNext = false;
    let i = 0;
    
    while (i < fixed.length) {
      const char = fixed[i];
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        result += char;
        i++;
        continue;
      }
      
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        result += char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
        result += char;
      } else if (!inString && char === ',') {
        // Check if next non-whitespace char is ] or }
        let j = i + 1;
        while (j < fixed.length && /\s/.test(fixed[j])) {
          j++;
        }
        
        if (j < fixed.length && (fixed[j] === ']' || fixed[j] === '}')) {
          // Skip this comma (don't add to result)
          i++;
          continue;
        } else {
          result += char;
        }
      } else {
        result += char;
      }
      
      i++;
    }
    
    fixed = result;
  }
  
  // 5. Handle undefined (if allowed)
  if (allowUndefined) {
    // Replace undefined with null (JSON doesn't support undefined)
    // Need to avoid replacing undefined inside strings
    let result = '';
    let inString = false;
    let stringChar = '';
    let escapeNext = false;
    let i = 0;
    
    while (i < fixed.length) {
      if (escapeNext) {
        result += fixed[i];
        escapeNext = false;
        i++;
        continue;
      }
      
      if (fixed[i] === '\\') {
        escapeNext = true;
        result += fixed[i];
        i++;
        continue;
      }
      
      if ((fixed[i] === '"' || fixed[i] === "'") && !inString) {
        inString = true;
        stringChar = fixed[i];
        result += fixed[i];
      } else if (inString && fixed[i] === stringChar) {
        inString = false;
        stringChar = '';
        result += fixed[i];
      } else if (!inString && fixed.substr(i, 9) === 'undefined') {
        // Check if it's really the undefined keyword (not part of a larger word)
        const before = i > 0 ? fixed[i - 1] : '';
        const after = i + 8 < fixed.length ? fixed[i + 9] : '';
        const isWordChar = /[a-zA-Z0-9_$]/.test(before) || /[a-zA-Z0-9_$]/.test(after);
        
        if (!isWordChar) {
          result += 'null';
          i += 9;
          continue;
        } else {
          result += fixed[i];
        }
      } else {
        result += fixed[i];
      }
      
      i++;
    }
    
    fixed = result;
  }
  
  // Try to parse the fixed string as JSON
  try {
    return JSON.parse(fixed);
  } catch (e) {
    // If still fails, try a manual parser as fallback
    // return manualParse(str, options);
    return undefined
  }
}


// Alternative: A simpler regex-based approach with better patterns
function simpleJsObjectParse(str: string): any {
  // This is a simpler version that just handles the most common cases
  let fixed = str;
  
  // Remove comments (simplified)
  fixed = fixed
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '');
  
  // Add quotes to unquoted keys (improved)
  // This pattern is more careful about what it matches
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, (match, prefix, key, suffix) => {
    // Don't quote if it's already a number or special value
    if (key === 'true' || key === 'false' || key === 'null' || key === 'undefined') {
      return match;
    }
    // Don't quote if it looks like a number
    if (/^\d/.test(key)) {
      return match;
    }
    return `${prefix}"${key}"${suffix}`;
  });
  
  // Convert single quotes to double (careful with escaped quotes)
  // This is a simplified approach - for production, use the state machine
  fixed = fixed.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  
  // Remove trailing commas
  fixed = fixed.replace(/,(\s*[\]}])/g, '$1');
  
  try {
    return JSON.parse(fixed);
  } catch (e) {
    throw new SyntaxError(`Failed to parse JavaScript object literal: ${e}`);
  }
}

// console.log('Testing regex fixes:');

// const testCases = [
//   // Unquoted keys
//   '{name: "John", age: 30}',
  
//   // Single quotes
//   "{'name': 'John', 'age': 30}",
  
//   // Mixed quotes
//   "{name: 'John', \"age\": 30}",
  
//   // Trailing comma
//   '{name: "John", age: 30,}',
  
//   // With comments
//   `{
//     // This is a comment
//     name: "John",
//     /* Multi-line
//        comment */
//     age: 30
//   }`,
  
//   // Array with trailing comma
//   '["a", "b", "c",]',
  
//   // Nested with issues
//   '{data: {name: "John", items: [1, 2, 3,]}}'
// ];

// testCases.forEach((test, i) => {
//   console.log(`\nTest ${i + 1}: ${test.slice(0, 50)}...`);
//   try {
//     const result = simpleJsObjectParse(test);
//     console.log('Success:', JSON.stringify(result));
//   } catch (e) {
//     console.log('Error:', e.message);
//   }
// });

// Export for use
export { customParse, simpleJsObjectParse, parseJsObjectLiteral };