type ParseOptions = {
  allowUnquotedKeys?: boolean;
  allowTrailingCommas?: boolean;
  allowSingleQuotes?: boolean;
  allowComments?: boolean;
  allowUndefined?: boolean;
  allowSpecialNumbers?: boolean;
  reviver?: (this: any, key: string, value: any) => any;
  strict?: boolean;
  maxDepth?: number;
};

class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
    public line: number,
    public column: number
  ) {
    super(`${message} at line ${line}, column ${column} (position ${position})`);
    this.name = 'ParseError';
  }
}

/**
 * Robust state machine parser for JavaScript object literals
 */
export function parseObjectLiteral<T = any>(str: string, options: ParseOptions = {}): T {
  // Validate input
  if (typeof str !== 'string') {
    throw new TypeError('Input must be a string');
  }

  if (str.trim().length === 0) {
    throw new ParseError('Input string is empty', 0, 1, 1);
  }

  // Set defaults
  const defaultOptions: Required<ParseOptions> = {
    allowUnquotedKeys: true,
    allowTrailingCommas: true,
    allowSingleQuotes: true,
    allowComments: true,
    allowUndefined: false,
    allowSpecialNumbers: false,
    reviver: undefined!,
    strict: false,
    maxDepth: 100,
  };

  const mergedOptions: Required<ParseOptions> = {
    ...defaultOptions,
    ...options,
  };

  // Parse state
  let index = 0;
  let char = str[0];
  let line = 1;
  let column = 1;
  let depth = 0;
  const optionsRef = mergedOptions;
  const maxLength = str.length;

  // Helper functions
  const isEnd = (): boolean => index >= maxLength;
  
  const advance = (): void => {
    if (char === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    
    index++;
    if (index < maxLength) {
      char = str[index];
    } else {
      char = '';
    }
  };
  
  const peek = (offset = 1): string => {
    const peekIndex = index + offset;
    return peekIndex < maxLength ? str[peekIndex] : '';
  };
  
  const createError = (message: string): ParseError => {
    return new ParseError(message, index, line, column);
  };
  
  const skipWhitespace = (): void => {
    while (!isEnd() && (char === ' ' || char === '\t' || char === '\n' || char === '\r')) {
      advance();
    }
  };
  
  const skipLineComment = (): void => {
    // We're at the first '/' of '//'
    advance(); // Skip second '/'
    
    while (!isEnd() && char !== '\n' && char !== '\r') {
      advance();
    }
  };
  
  const skipBlockComment = (): void => {
    // We're at the first '/' of '/*'
    advance(); // Skip '*'
    
    while (!isEnd()) {
      if (char === '*' && peek() === '/') {
        advance(); // Skip '*'
        advance(); // Skip '/'
        return;
      }
      advance();
    }
    
    throw createError('Unterminated block comment');
  };
  
  const skipWhitespaceAndComments = (): void => {
    while (!isEnd()) {
      const prevIndex = index;
      skipWhitespace();
      
      if (optionsRef.allowComments && char === '/') {
        const nextChar = peek();
        if (nextChar === '/') {
          skipLineComment();
          continue;
        } else if (nextChar === '*') {
          skipBlockComment();
          continue;
        }
      }
      
      if (index === prevIndex) {
        break;
      }
    }
  };

  // ====================
  // Parsing Functions
  // ====================

  const parseValue = (): any => {
    depth++;
    if (depth > optionsRef.maxDepth) {
      throw createError(`Maximum nesting depth (${optionsRef.maxDepth}) exceeded`);
    }
    
    skipWhitespaceAndComments();
    
    if (isEnd()) {
      throw createError('Unexpected end of input');
    }
    
    let value: any;
    
    // Parse based on current character
    const currentChar = char;
    
    if (currentChar === '{') {
      value = parseObject();
    } else if (currentChar === '[') {
      value = parseArray();
    } else if (currentChar === '"' || currentChar === "'") {
      value = parseString();
    } else if (currentChar === '-' || (currentChar >= '0' && currentChar <= '9')) {
      value = parseNumber();
    } else if (currentChar === 't' || currentChar === 'f' || currentChar === 'n') {
      value = parseKeyword();
    } else if (currentChar === 'u' && optionsRef.allowUndefined) {
      value = parseKeyword();
    } else if ((currentChar === 'I' || currentChar === 'N') && optionsRef.allowSpecialNumbers) {
      value = parseSpecialNumber();
    } else {
      // throw createError(`Unexpected character "${currentChar}"`);
    }
    
    depth--;
    return value;
  };

  const parseObject = (): Record<string, any> => {
    const obj: Record<string, any> = {};
    
    // Skip opening brace
    advance();
    
    skipWhitespaceAndComments();
    
    // Handle empty object
    if (char === '}') {
      advance();
      return obj;
    }
    
    // Parse object properties
    while (!isEnd()) {
      skipWhitespaceAndComments();
      
      // Parse key
      let key: string;
      const currentChar = char;
      
      if (currentChar === '"' || currentChar === "'") {
        key = parseString();
      } else if (optionsRef.allowUnquotedKeys && 
                ((currentChar >= 'a' && currentChar <= 'z') || 
                 (currentChar >= 'A' && currentChar <= 'Z') || 
                 currentChar === '_' || currentChar === '$')) {
        const start = index;
        while (!isEnd() && 
              ((char >= 'a' && char <= 'z') || 
               (char >= 'A' && char <= 'Z') || 
               (char >= '0' && char <= '9') || 
               char === '_' || char === '$')) {
          advance();
        }
        key = str.slice(start, index);
        
        // Validate it's not a keyword
        if (key === 'true' || key === 'false' || key === 'null' || 
            (optionsRef.allowUndefined && key === 'undefined')) {
          throw createError(`Keyword "${key}" cannot be used as unquoted property name`);
        }
      } else {
        throw createError(`Expected property name, got "${char}"`);
      }
      
      skipWhitespaceAndComments();
      
      // Expect colon
      // if (char !== ':') {
      //   throw createError('Expected colon after property name');
      // }
      advance();
      
      skipWhitespaceAndComments();
      
      // Parse value
      obj[key] = parseValue();
      
      skipWhitespaceAndComments();
      
      // Check what comes next
      const nextChar = char;
      
      if (nextChar === '}') {
        advance();
        return obj;
      }
      
      if (nextChar === ',') {
        advance();
        skipWhitespaceAndComments();
        
        // Check if the next thing is a closing brace (trailing comma)
        const afterCommaChar = char;
        if (afterCommaChar === '}') {
          if (optionsRef.allowTrailingCommas) {
            advance();
            return obj;
          } else {
            throw createError('Trailing comma not allowed');
          }
        }
        
        // Continue to next property
        continue;
      }
      
      // throw createError(`Expected comma or closing brace, got "${nextChar}"`);
      continue
    }
    
    throw createError('Unexpected end of input in object');
  };

  const parseArray = (): any[] => {
    const arr: any[] = [];
    
    // Skip opening bracket
    advance();
    
    skipWhitespaceAndComments();
    
    // Handle empty array
    if (char === ']') {
      advance();
      return arr;
    }
    
    // Parse array elements
    while (!isEnd()) {
      // Parse element
      arr.push(parseValue());
      
      skipWhitespaceAndComments();
      
      // Check what comes next
      const nextChar = char;
      
      if (nextChar === ']') {
        advance();
        return arr;
      }
      
      if (nextChar === ',') {
        advance();
        skipWhitespaceAndComments();
        
        // Check if the next thing is a closing bracket (trailing comma)
        const afterCommaChar = char;
        if (afterCommaChar === ']') {
          if (optionsRef.allowTrailingCommas) {
            advance();
            return arr;
          } else {
            throw createError('Trailing comma not allowed');
          }
        }
        
        // Continue to next element
        continue;
      }
      
      throw createError(`Expected comma or closing bracket, got "${nextChar}"`);
    }
    
    throw createError('Unexpected end of input in array');
  };

  const parseString = (): string => {
    const quoteChar = char;
    const startPos = index;
    
    if (quoteChar === "'" && !optionsRef.allowSingleQuotes) {
      throw createError('Single quotes are not allowed');
    }
    
    // Skip opening quote
    advance();
    
    let result = '';
    
    while (!isEnd()) {
      const currentChar = char;
      
      if (currentChar === '\\') {
        // Handle escape sequence
        advance();
        if (isEnd()) {
          throw createError('Unterminated escape sequence');
        }
        result += parseEscapeSequence(quoteChar);
      } else if (currentChar === quoteChar) {
        // End of string
        advance();
        return result;
      } else if (currentChar === '\n' || currentChar === '\r') {
        // Newline in string (not allowed unless escaped)
        throw createError('Unterminated string literal');
      } else {
        result += currentChar;
        advance();
      }
    }
    
    throw createError(`Unterminated string literal starting at position ${startPos}`);
  };

  const parseEscapeSequence = (quoteChar: string): string => {
    const escapeChar = char;
    
    if (escapeChar === 'b') {
      advance();
      return '\b';
    } else if (escapeChar === 'f') {
      advance();
      return '\f';
    } else if (escapeChar === 'n') {
      advance();
      return '\n';
    } else if (escapeChar === 'r') {
      advance();
      return '\r';
    } else if (escapeChar === 't') {
      advance();
      return '\t';
    } else if (escapeChar === 'v') {
      advance();
      return '\v';
    } else if (escapeChar === '0') {
      advance();
      return '\0';
    } else if (escapeChar === 'x') {
      advance();
      return parseHexEscape(2);
    } else if (escapeChar === 'u') {
      advance();
      return parseUnicodeEscape();
    } else if (escapeChar === '\n') {
      // Line continuation
      advance();
      return '';
    } else if (escapeChar === '\r') {
      // Windows line continuation
      if (peek() === '\n') {
        advance(); // Skip \r
        advance(); // Skip \n
      } else {
        advance();
      }
      return '';
    } else {
      // Return the character itself (for \\, \", \', etc.)
      const charToReturn = escapeChar;
      advance();
      return charToReturn;
    }
  };

  const parseHexEscape = (length: number): string => {
    let hex = '';
    
    for (let i = 0; i < length; i++) {
      const currentChar = char;
      const isHex = (currentChar >= '0' && currentChar <= '9') || 
                   (currentChar >= 'a' && currentChar <= 'f') || 
                   (currentChar >= 'A' && currentChar <= 'F');
      
      if (isEnd() || !isHex) {
        throw createError('Invalid hex escape sequence');
      }
      hex += currentChar;
      advance();
    }
    
    return String.fromCharCode(parseInt(hex, 16));
  };

  const parseUnicodeEscape = (): string => {
    // Check for Unicode code point escape \u{...}
    const currentChar = char;
    
    if (currentChar === '{') {
      advance();
      let hex = '';
      
      while (!isEnd() && char !== '}') {
        const currentHexChar = char;
        const isHex = (currentHexChar >= '0' && currentHexChar <= '9') || 
                     (currentHexChar >= 'a' && currentHexChar <= 'f') || 
                     (currentHexChar >= 'A' && currentHexChar <= 'F');
        
        if (!isHex) {
          throw createError('Invalid Unicode code point');
        }
        hex += currentHexChar;
        advance();
      }
      
      if (char !== '}') {
        throw createError('Unterminated Unicode code point escape');
      }
      advance(); // Skip '}'
      
      const codePoint = parseInt(hex, 16);
      if (isNaN(codePoint) || codePoint > 0x10FFFF) {
        throw createError('Invalid Unicode code point');
      }
      
      return String.fromCodePoint(codePoint);
    }
    
    // Regular 4-digit hex escape
    return parseHexEscape(4);
  };

  const parseNumber = (): number => {
    const start = index;
    let numberStr = '';
    
    // Optional sign
    if (char === '-') {
      numberStr += char;
      advance();
    }
    
    // Check for special numbers first
    if (optionsRef.allowSpecialNumbers) {
      if (char === 'I') {
        const word = str.slice(index, index + 8);
        if (word === 'Infinity') {
          for (let i = 0; i < 8; i++) advance();
          return numberStr === '-' ? -Infinity : Infinity;
        }
      } else if (char === 'N') {
        const word = str.slice(index, index + 3);
        if (word === 'NaN') {
          for (let i = 0; i < 3; i++) advance();
          return NaN;
        }
      }
    }
    
    // Integer part
    if (char === '0') {
      numberStr += char;
      advance();
      
      // Check for non-decimal literals (only if allowUnquotedKeys is true)
      if (optionsRef.allowUnquotedKeys) {
        // const radixChar = char;
        const radixChar = numberStr.charAt(1);
        if (radixChar === 'x' || radixChar === 'X') {
          // Hexadecimal
          advance();
          return parseNonDecimalNumber(16);
        } else if (radixChar === 'o' || radixChar === 'O') {
          // Octal
          advance();
          return parseNonDecimalNumber(8);
        } else if (radixChar === 'b' || radixChar === 'B') {
          // Binary
          advance();
          return parseNonDecimalNumber(2);
        }
      }
    }
    
    // Collect integer digits
    while (!isEnd() && char >= '0' && char <= '9') {
      numberStr += char;
      advance();
    }
    
    // Fraction part
    if (char === '.') {
      numberStr += char;
      advance();
      
      // Must have at least one digit after decimal point
      if (!(char >= '0' && char <= '9')) {
        throw createError('Expected digit after decimal point');
      }
      
      while (!isEnd() && char >= '0' && char <= '9') {
        numberStr += char;
        advance();
      }
    }
    
    // Exponent part
    if (char === 'e' || char === 'E') {
      numberStr += char;
      advance();
      
      // Optional exponent sign
      if (peek() === '+' || peek() === '-') {
        numberStr += char;
        advance();
      }
      
      // Must have at least one digit in exponent
      if (!(char >= '0' && char <= '9')) {
        throw createError('Expected digit in exponent');
      }
      
      while (!isEnd() && char >= '0' && char <= '9') {
        numberStr += char;
        advance();
      }
    }
    
    const num = parseFloat(numberStr);
    if (isNaN(num)) {
      throw createError(`Invalid number "${numberStr}"`);
    }
    
    return num;
  };

  const parseNonDecimalNumber = (radix: number): number => {
    let digits = '';
    
    while (!isEnd()) {
      const currentChar = char;
      let isValid = false;
      
      if (radix === 16) {
        isValid = (currentChar >= '0' && currentChar <= '9') || 
                 (currentChar >= 'a' && currentChar <= 'f') || 
                 (currentChar >= 'A' && currentChar <= 'F');
      } else if (radix === 8) {
        isValid = currentChar >= '0' && currentChar <= '7';
      } else if (radix === 2) {
        isValid = currentChar === '0' || currentChar === '1';
      }
      
      if (!isValid) {
        break;
      }
      
      digits += currentChar;
      advance();
    }
    
    if (digits.length === 0) {
      const baseName = radix === 16 ? 'hexadecimal' : radix === 8 ? 'octal' : 'binary';
      throw createError(`Invalid ${baseName} number`);
    }
    
    return parseInt(digits, radix);
  };

  const parseSpecialNumber = (): number => {
    if (char === 'I' && str.slice(index, index + 8) === 'Infinity') {
      for (let i = 0; i < 8; i++) advance();
      return Infinity;
    } else if (char === 'N' && str.slice(index, index + 3) === 'NaN') {
      for (let i = 0; i < 3; i++) advance();
      return NaN;
    } else if (char === '-' && str.slice(index, index + 9) === '-Infinity') {
      for (let i = 0; i < 9; i++) advance();
      return -Infinity;
    }
    
    throw createError('Invalid special number');
  };

  const parseKeyword = (): any => {
    const start = index;
    let keyword = '';
    
    while (!isEnd()) {
      const currentChar = char;
      const isIdentifierChar = (currentChar >= 'a' && currentChar <= 'z') || 
                              (currentChar >= 'A' && currentChar <= 'Z') || 
                              (currentChar >= '0' && currentChar <= '9') || 
                              currentChar === '_' || currentChar === '$';
      
      if (!isIdentifierChar) {
        break;
      }
      keyword += currentChar;
      advance();
    }
    
    if (keyword === 'true') {
      return true;
    } else if (keyword === 'false') {
      return false;
    } else if (keyword === 'null') {
      return null;
    } else if (keyword === 'undefined' && optionsRef.allowUndefined) {
      return undefined;
    } else {
      throw createError(`Unknown keyword "${keyword}"`);
    }
  };

  // Apply reviver function
  const applyReviver = (
    holder: Record<string, any>,
    key: string,
    value: any,
    reviver: (this: any, key: string, value: any) => any
  ): any => {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const transformed = applyReviver(value, i.toString(), value[i], reviver);
          if (transformed === undefined) {
            value.splice(i, 1);
            i--;
          } else {
            value[i] = transformed;
          }
        }
      } else {
        for (const k in value) {
          if (Object.prototype.hasOwnProperty.call(value, k)) {
            const transformed = applyReviver(value, k, value[k], reviver);
            if (transformed === undefined) {
              delete value[k];
            } else {
              value[k] = transformed;
            }
          }
        }
      }
    }
    
    return reviver.call(holder, key, value);
  };

  // ====================
  // Main Parsing Logic
  // ====================

  try {
    // Start parsing
    skipWhitespaceAndComments();
    const result = parseValue();
    
    // Ensure we consumed everything
    skipWhitespaceAndComments();
    if (!isEnd()) {
      throw createError(`Unexpected trailing content: "${str.slice(index, index + 20)}"`);
    }
    
    // Apply reviver if provided
    if (mergedOptions.reviver) {
      return applyReviver({ '': result }, '', result, mergedOptions.reviver) as T;
    }
    
    return result as T;
  } catch (error) {
    // Fallback to JSON.parse if not strict
    if (!mergedOptions.strict && error instanceof ParseError) {
      try {
        return mergedOptions.reviver
          ? JSON.parse(str, mergedOptions.reviver)
          : JSON.parse(str);
      } catch {
        throw error; // Re-throw original error
      }
    }
    throw error;
  }
}

// // Test the parser
// const testCases = [
//   // Basic JSON
//   '{"name": "John", "age": 30}',
  
//   // JavaScript object literals
//   '{name: "John", age: 30}',
//   "{'name': 'John', 'age': 30}",
  
//   // Arrays
//   '[1, 2, 3]',
//   '[1, 2, 3,]',
  
//   // Comments
//   '{// comment\n name: "John"}',
//   '{/* comment */ name: "John"}',
  
//   // Nested
//   '{data: {users: [{id: 1, name: "Alice"}]}}',
  
//   // Special numbers (when enabled)
//   // '{inf: Infinity, nan: NaN}',
  
//   // Undefined (when enabled)
//   // '{value: undefined}',
// ];

// console.log('Testing parser...\n');

// for (let i = 0; i < testCases.length; i++) {
//   const input = testCases[i];
//   try {
//     const result = parseObjectLiteral(input, {
//       allowUnquotedKeys: true,
//       allowSingleQuotes: true,
//       allowTrailingCommas: true,
//       allowComments: true,
//     });
//     console.log(`✓ Test ${i + 1} passed: ${input.substring(0, 40)}`);
//     console.log(`  Result: ${JSON.stringify(result).substring(0, 50)}`);
//   } catch (error) {
//     console.log(`✗ Test ${i + 1} failed: ${error.message}`);
//   }
// }

// export { parseObjectLiteral, ParseError, type ParseOptions };