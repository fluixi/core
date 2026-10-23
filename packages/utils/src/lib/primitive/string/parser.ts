

// /**
//  * Safe, typed parser for JavaScript object literals
//  */
// export function parseObjectString<T = any>(str: string, options: ParserOptions = {}): T {
//   // Input validation
//   if (typeof str !== 'string') {
//     throw new TypeError('Input must be a string');
//   }

//   const skipComments = (): void => {
//     if (!opts.allowComments) return;

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

//   const parseObject = (depth: number): Record<string, any> => {
//     const obj: Record<string, any> = {};
//     next(); // Skip '{'
    

//     while (!isEnd()) {
//       skipWhitespaceAndComments();

//       // Value
//       obj[key] = parseValue(depth);

        

//       throw new ParseError('Expected comma or closing brace', index);
//     }

//   const parseArray = (depth: number): any[] => {
//     const arr: any[] = [];
//     next(); // Skip '['
    

//     while (!isEnd()) {
//       arr.push(parseValue(depth));

        

//       throw new ParseError('Expected comma or closing bracket', index);
//     }

//     next(); // Skip opening quote
//     let result = '';
//     const startIndex = index;

//     next(); // Skip closing quote
//     return result;
//   };

//   const parseEscapeSequence = (): string => {
//     const escStart = index;
    

    
    

      

      
      

//   const parseSpecialNumber = (): number => {
//     const start = index;
    
    
//     throw new ParseError('Invalid special number', start);
//   };

    
    

  

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

// Export for use
export { customParse, simpleJsObjectParse, parseJsObjectLiteral };