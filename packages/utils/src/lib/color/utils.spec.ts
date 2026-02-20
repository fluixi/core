/**
 * @fileoverview Comprehensive tests for color utility functions
 * Focus on testing all RGB/RGBA syntax variations
 */

import { describe, it, expect } from 'vitest';
import { parseColor, parseRgbaColor, isValidColor } from './utils.js';

describe('parseRgbaColor', () => {
  describe('Legacy comma-separated syntax', () => {
    it('should parse rgb(255, 0, 0)', () => {
      const result = parseRgbaColor('rgb(255, 0, 0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(255,0,0) without spaces', () => {
      const result = parseRgbaColor('rgb(255,0,0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(255,  0,  0) with extra spaces', () => {
      const result = parseRgbaColor('rgb(255,  0,  0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgba(255, 0, 0, 0.5)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgba(255, 0, 0, 1)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 1)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgba(255, 0, 0, 0)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 0)');
      expect(result).toEqual([255, 0, 0, 0]);
    });

    it('should parse rgba(255,0,0,0.5) without spaces', () => {
      const result = parseRgbaColor('rgba(255,0,0,0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgba(255, 0, 0, 50%)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 50%)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgba(255, 0, 0, 100%)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 100%)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgba(255, 0, 0, 0%)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 0%)');
      expect(result).toEqual([255, 0, 0, 0]);
    });
  });

  describe('Modern space-separated syntax', () => {
    it('should parse rgb(255 0 0)', () => {
      const result = parseRgbaColor('rgb(255 0 0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(255  0  0) with extra spaces', () => {
      const result = parseRgbaColor('rgb(255  0  0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(255 0 0 / 0.5)', () => {
      const result = parseRgbaColor('rgb(255 0 0 / 0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgb(255 0 0 / 50%)', () => {
      const result = parseRgbaColor('rgb(255 0 0 / 50%)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgb(255 0 0 / 1)', () => {
      const result = parseRgbaColor('rgb(255 0 0 / 1)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(255 0 0 / 0)', () => {
      const result = parseRgbaColor('rgb(255 0 0 / 0)');
      expect(result).toEqual([255, 0, 0, 0]);
    });

    it('should parse rgba(255 0 0 / 0.5)', () => {
      const result = parseRgbaColor('rgba(255 0 0 / 0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgba(255 0 0 / 50%)', () => {
      const result = parseRgbaColor('rgba(255 0 0 / 50%)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgb(255 0 0/0.5) without spaces around slash', () => {
      const result = parseRgbaColor('rgb(255 0 0/0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });
  });

  describe('Percentage values', () => {
    it('should parse rgb(100%, 0%, 0%)', () => {
      const result = parseRgbaColor('rgb(100%, 0%, 0%)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(100%,0%,0%)', () => {
      const result = parseRgbaColor('rgb(100%,0%,0%)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(100% 0% 0%)', () => {
      const result = parseRgbaColor('rgb(100% 0% 0%)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgb(50%, 50%, 50%)', () => {
      const result = parseRgbaColor('rgb(50%, 50%, 50%)');
      expect(result).toEqual([128, 128, 128, 1]);
    });

    it('should parse rgb(100% 0% 0% / 50%)', () => {
      const result = parseRgbaColor('rgb(100% 0% 0% / 50%)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgba(100%, 0%, 0%, 0.5)', () => {
      const result = parseRgbaColor('rgba(100%, 0%, 0%, 0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse rgba(100%, 0%, 0%, 50%)', () => {
      const result = parseRgbaColor('rgba(100%, 0%, 0%, 50%)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });
  });

  describe('Decimal values', () => {
    it('should parse rgb(255.5, 127.8, 0.3)', () => {
      const result = parseRgbaColor('rgb(255.5, 127.8, 0.3)');
      expect(result).toEqual([255, 128, 0, 1]);
    });

    it('should parse rgb(128.5, 64.2, 32.7)', () => {
      const result = parseRgbaColor('rgb(128.5, 64.2, 32.7)');
      expect(result).toEqual([129, 64, 33, 1]);
    });

    it('should parse rgba(255.5, 127.8, 0.3, 0.75)', () => {
      const result = parseRgbaColor('rgba(255.5, 127.8, 0.3, 0.75)');
      expect(result).toEqual([255, 128, 0, 0.75]);
    });

    it('should parse rgb(255.9 127.1 64.5)', () => {
      const result = parseRgbaColor('rgb(255.9 127.1 64.5)');
      expect(result).toEqual([255, 127, 65, 1]);
    });
  });

  describe('Mixed percentage and absolute values', () => {
    it('should parse rgb(100%, 128, 0)', () => {
      const result = parseRgbaColor('rgb(100%, 128, 0)');
      expect(result).toEqual([255, 128, 0, 1]);
    });

    it('should parse rgb(255, 50%, 0)', () => {
      const result = parseRgbaColor('rgb(255, 50%, 0)');
      expect(result).toEqual([255, 128, 0, 1]);
    });

    it('should parse rgb(255 50% 0)', () => {
      const result = parseRgbaColor('rgb(255 50% 0)');
      expect(result).toEqual([255, 128, 0, 1]);
    });
  });

  describe('Case insensitivity', () => {
    it('should parse RGB(255, 0, 0)', () => {
      const result = parseRgbaColor('RGB(255, 0, 0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse RGBA(255, 0, 0, 0.5)', () => {
      const result = parseRgbaColor('RGBA(255, 0, 0, 0.5)');
      expect(result).toEqual([255, 0, 0, 0.5]);
    });

    it('should parse Rgb(255, 0, 0)', () => {
      const result = parseRgbaColor('Rgb(255, 0, 0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });
  });

  describe('Edge cases', () => {
    it('should clamp values above 255', () => {
      const result = parseRgbaColor('rgb(300, 400, 500)');
      expect(result).toEqual([255, 255, 255, 1]);
    });

    it('should clamp negative values to 0', () => {
      const result = parseRgbaColor('rgb(-10, -20, -30)');
      expect(result).toEqual([0, 0, 0, 1]);
    });

    it('should clamp alpha above 1', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, 2)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should clamp negative alpha to 0', () => {
      const result = parseRgbaColor('rgba(255, 0, 0, -0.5)');
      expect(result).toEqual([255, 0, 0, 0]);
    });

    it('should handle percentage above 100%', () => {
      const result = parseRgbaColor('rgb(150%, 200%, 250%)');
      expect(result).toEqual([255, 255, 255, 1]);
    });

    it('should handle negative percentage', () => {
      const result = parseRgbaColor('rgb(-50%, -100%, -150%)');
      expect(result).toEqual([0, 0, 0, 1]);
    });

    it('should parse with extra whitespace', () => {
      const result = parseRgbaColor('  rgb(  255  ,  0  ,  0  )  ');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse rgba with no alpha (defaults to 1)', () => {
      const result = parseRgbaColor('rgba(255, 0, 0)');
      expect(result).toEqual([255, 0, 0, 1]);
    });
  });

  describe('Invalid inputs', () => {
    it('should return null for empty string', () => {
      const result = parseRgbaColor('');
      expect(result).toBeNull();
    });

    it('should return null for non-rgb format', () => {
      const result = parseRgbaColor('#ff0000');
      expect(result).toBeNull();
    });

    it('should return null for CSS variables', () => {
      const result = parseRgbaColor('rgb(var(--r), var(--g), var(--b))');
      expect(result).toBeNull();
    });

    it('should return null for invalid syntax', () => {
      const result = parseRgbaColor('rgb(255 0 0 0.5)'); // Missing slash
      expect(result).toBeNull();
    });

    it('should return null for missing values', () => {
      const result = parseRgbaColor('rgb(255, 0)');
      expect(result).toBeNull();
    });

    it('should return null for non-numeric values', () => {
      const result = parseRgbaColor('rgb(red, green, blue)');
      expect(result).toBeNull();
    });
  });

  describe('Real-world examples', () => {
    it('should parse rgb(52, 152, 219)', () => {
      const result = parseRgbaColor('rgb(52, 152, 219)');
      expect(result).toEqual([52, 152, 219, 1]);
    });

    it('should parse rgba(52, 152, 219, 0.8)', () => {
      const result = parseRgbaColor('rgba(52, 152, 219, 0.8)');
      expect(result).toEqual([52, 152, 219, 0.8]);
    });

    it('should parse rgb(231 76 60)', () => {
      const result = parseRgbaColor('rgb(231 76 60)');
      expect(result).toEqual([231, 76, 60, 1]);
    });

    it('should parse rgb(231 76 60 / 0.9)', () => {
      const result = parseRgbaColor('rgb(231 76 60 / 0.9)');
      expect(result).toEqual([231, 76, 60, 0.9]);
    });
  });
});

describe('parseColor', () => {
  describe('RGB/RGBA colors', () => {
    it('should parse all rgb formats via parseColor', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual([255, 0, 0, 1]);
      expect(parseColor('rgb(255 0 0)')).toEqual([255, 0, 0, 1]);
      expect(parseColor('rgb(255 0 0 / 0.5)')).toEqual([255, 0, 0, 0.5]);
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual([255, 0, 0, 0.5]);
    });
  });

  describe('Hex colors', () => {
    it('should parse #rgb', () => {
      const result = parseColor('#f00');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse #rrggbb', () => {
      const result = parseColor('#ff0000');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse #rrggbbaa', () => {
      const result = parseColor('#ff000080');
      expect(result?.[3]).toBeCloseTo(0.5, 2);
    });

    it('should parse #rgba', () => {
      const result = parseColor('#f008');
      expect(result?.[3]).toBeCloseTo(0.53, 2);
    });
  });

  describe('Named colors', () => {
    it('should parse named color "red"', () => {
      const result = parseColor('red');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse named color "blue"', () => {
      const result = parseColor('blue');
      expect(result).toEqual([0, 0, 255, 1]);
    });

    it('should parse named color "transparent"', () => {
      const result = parseColor('transparent');
      expect(result).toEqual([0, 0, 0, 0]);
    });
  });

  describe('HSL colors', () => {
    it('should parse hsl(0, 100%, 50%)', () => {
      const result = parseColor('hsl(0, 100%, 50%)');
      expect(result?.[0]).toBeCloseTo(255, 0);
      expect(result?.[1]).toBeCloseTo(0, 0);
      expect(result?.[2]).toBeCloseTo(0, 0);
    });

    it('should parse hsla(0, 100%, 50%, 0.5)', () => {
      const result = parseColor('hsla(0, 100%, 50%, 0.5)');
      expect(result?.[3]).toBe(0.5);
    });
  });

  describe('Invalid inputs', () => {
    it('should return null for empty string', () => {
      const result = parseColor('');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = parseColor('not-a-color');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = parseColor(null as any);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parseColor(undefined as any);
      expect(result).toBeNull();
    });
  });
});

describe('isValidColor', () => {
  describe('Valid colors', () => {
    it('should validate hex colors', () => {
      expect(isValidColor('#ff0000')).toBe(true);
      expect(isValidColor('#f00')).toBe(true);
      expect(isValidColor('#ff0000ff')).toBe(true);
    });

    it('should validate rgb colors', () => {
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('rgb(255 0 0)')).toBe(true);
      expect(isValidColor('rgb(100%, 0%, 0%)')).toBe(true);
    });

    it('should validate rgba colors', () => {
      expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      expect(isValidColor('rgb(255 0 0 / 0.5)')).toBe(true);
      expect(isValidColor('rgba(255, 0, 0, 50%)')).toBe(true);
    });

    it('should validate named colors', () => {
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('blue')).toBe(true);
      expect(isValidColor('transparent')).toBe(true);
    });

    it('should validate hsl colors', () => {
      expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true);
      expect(isValidColor('hsla(0, 100%, 50%, 0.5)')).toBe(true);
    });
  });

  describe('Invalid colors', () => {
    it('should reject invalid formats', () => {
      expect(isValidColor('not-a-color')).toBe(false);
      expect(isValidColor('')).toBe(false);
      expect(isValidColor('rgb()')).toBe(false);
      expect(isValidColor('#gggggg')).toBe(false);
    });

    it('should reject invalid rgb syntax', () => {
      // Note: rgb(255 0 0 0.5) without slash will be rejected by our parser
      // but isValidColor only checks format patterns, not actual parsing
      expect(isValidColor('rgb(255, 0)')).toBe(false); // Missing value
      expect(isValidColor('rgb(abc, def, ghi)')).toBe(false); // Non-numeric
    });

    it('should accept valid rgb syntax even with out-of-range values', () => {
      // Our parser clamps values, so these are valid formats
      expect(isValidColor('rgb(300, 0, 0)')).toBe(true); // Will be clamped to 255
      expect(isValidColor('rgb(-10, 0, 0)')).toBe(true); // Will be clamped to 0
    });
  });
});

describe('RGB/RGBA Comprehensive Syntax Test Suite', () => {
  const testCases = [
    // Standard formats
    {
      input: 'rgb(255, 0, 0)',
      expected: [255, 0, 0, 1],
      name: 'standard comma RGB',
    },
    {
      input: 'rgba(255, 0, 0, 0.5)',
      expected: [255, 0, 0, 0.5],
      name: 'standard comma RGBA',
    },
    {
      input: 'rgb(255 0 0)',
      expected: [255, 0, 0, 1],
      name: 'modern space RGB',
    },
    {
      input: 'rgb(255 0 0 / 0.5)',
      expected: [255, 0, 0, 0.5],
      name: 'modern space RGB with alpha',
    },

    // No spaces
    {
      input: 'rgb(255,0,0)',
      expected: [255, 0, 0, 1],
      name: 'no spaces comma',
    },
    {
      input: 'rgba(255,0,0,0.5)',
      expected: [255, 0, 0, 0.5],
      name: 'no spaces comma RGBA',
    },

    // Extra spaces
    {
      input: 'rgb(  255  ,  0  ,  0  )',
      expected: [255, 0, 0, 1],
      name: 'extra spaces comma',
    },
    {
      input: 'rgb(  255   0   0  )',
      expected: [255, 0, 0, 1],
      name: 'extra spaces modern',
    },

    // Percentages
    {
      input: 'rgb(100%, 0%, 0%)',
      expected: [255, 0, 0, 1],
      name: 'percentage RGB',
    },
    {
      input: 'rgb(50%, 50%, 50%)',
      expected: [128, 128, 128, 1],
      name: 'percentage gray',
    },
    {
      input: 'rgba(100%, 0%, 0%, 50%)',
      expected: [255, 0, 0, 0.5],
      name: 'percentage RGBA',
    },
    {
      input: 'rgb(100% 0% 0% / 50%)',
      expected: [255, 0, 0, 0.5],
      name: 'percentage modern',
    },

    // Decimals
    {
      input: 'rgb(255.5, 127.8, 0.3)',
      expected: [255, 128, 0, 1],
      name: 'decimal values',
    },
    {
      input: 'rgba(255.9, 127.1, 64.5, 0.75)',
      expected: [255, 127, 65, 0.75],
      name: 'decimal RGBA',
    },

    // Case variations
    {
      input: 'RGB(255, 0, 0)',
      expected: [255, 0, 0, 1],
      name: 'uppercase RGB',
    },
    {
      input: 'RGBA(255, 0, 0, 0.5)',
      expected: [255, 0, 0, 0.5],
      name: 'uppercase RGBA',
    },
    { input: 'Rgb(255, 0, 0)', expected: [255, 0, 0, 1], name: 'mixed case' },
  ];

  testCases.forEach(({ input, expected, name }) => {
    it(`should correctly parse: ${name} - "${input}"`, () => {
      const result = parseRgbaColor(input);
      expect(result).toEqual(expected);
    });
  });
});
