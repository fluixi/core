import { NAMED_COLORS, type NamedColor } from './constants.js';
import { anyToRgb } from './conversions.js';
import type {
  ColorAdjustmentOptions,
  ColorMixOptions,
  PaletteOptions,
  ContrastOptions,
} from './types.js';

/**
 * Comprehensive RGB/RGBA regex patterns
 */
export const RGB_PATTERNS = {
  /**
   * Matches legacy comma-separated RGB
   * @example rgb(255, 0, 0)
   */
  LEGACY_RGB:
    /^rgb\(\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s*,\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s*,\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s*\)$/i,

  /**
   * Matches modern space-separated RGB
   * @example rgb(255 0 0)
   */
  MODERN_RGB:
    /^rgb\(\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s+(\d{1,3}|\.\d+|\d+\.\d+%?)\s+(\d{1,3}|\.\d+|\d+\.\d+%?)\s*\)$/i,

  /**
   * Matches legacy comma-separated RGBA
   * @example rgba(255, 0, 0, 0.5)
   * @example rgba(255, 0, 0, 50%)
   */
  LEGACY_RGBA:
    /^rgba\(\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s*,\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s*,\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s*,\s*(0|1|0?\.\d+|\d{1,3}%?|\.\d+%?)\s*\)$/i,

  /**
   * Matches modern space-separated RGBA with slash
   * @example rgb(255 0 0 / 0.5)
   * @example rgb(255 0 0 / 50%)
   * @example rgba(255 0 0 / 0.5)
   */
  MODERN_RGBA:
    /^rgba?\(\s*(\d{1,3}|\.\d+|\d+\.\d+%?)\s+(\d{1,3}|\.\d+|\d+\.\d+%?)\s+(\d{1,3}|\.\d+|\d+\.\d+%?)\s*\/\s*(0|1|0?\.\d+|\d{1,3}%?|\.\d+%?)\s*\)$/i,

  /**
   * Combined pattern that matches all RGB/RGBA variations
   * Supports:
   * - Legacy comma-separated: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
   * - Modern space-separated: rgb(255 0 0), rgb(255 0 0 / 0.5)
   * - Mixed separators: rgb(255,0,0), rgb(255 0 0)
   * - Percentages: rgb(100% 0% 0%), rgb(100% 0% 0% / 50%)
   * - Decimal numbers: rgb(255.5 0 0), rgba(255, 0, 0, 0.5)
   * - CSS variables: rgb(var(--red) var(--green) var(--blue))
   */
  COMPREHENSIVE:
    /^rgba?\(\s*((?:\d{1,3}(?:\.\d+)?%?|\.\d+%?|var\([^)]+\)))\s*(?:[,\s]\s*((?:\d{1,3}(?:\.\d+)?%?|\.\d+%?|var\([^)]+\))))?\s*(?:[,\s]\s*((?:\d{1,3}(?:\.\d+)?%?|\.\d+%?|var\([^)]+\))))?\s*(?:(?:\s*[,\s]?\s*\/?\s*|\s*\/\s*)((?:0|1|0?\.\d+|\.\d+|\d{1,3}%?|var\([^)]+\))))?\s*\)$/i,

  /**
   * Strict RGB pattern with validation
   * Matches integers (0-255) or percentages (0-100%)
   */
  STRICT_RGB:
    /^rgb\(\s*((?:\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]|\d{1,2}(?:\.\d+)?%|100%|\.\d+%?|var\([^)]+\)))\s*,\s*((?:\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]|\d{1,2}(?:\.\d+)?%|100%|\.\d+%?|var\([^)]+\)))\s*,\s*((?:\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]|\d{1,2}(?:\.\d+)?%|100%|\.\d+%?|var\([^)]+\)))\s*\)$/i,

  /**
   * Strict RGBA pattern with validation
   */
  STRICT_RGBA:
    /^rgba\(\s*((?:\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]|\d{1,2}(?:\.\d+)?%|100%|\.\d+%?|var\([^)]+\)))\s*,\s*((?:\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]|\d{1,2}(?:\.\d+)?%|100%|\.\d+%?|var\([^)]+\)))\s*,\s*((?:\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]|\d{1,2}(?:\.\d+)?%|100%|\.\d+%?|var\([^)]+\)))\s*,\s*((?:0|1|0?\.\d+|\.\d+|\d{1,2}(?:\.\d+)?%|100%|var\([^)]+\)))\s*\)$/i,

  /**
   * Modern RGB with optional alpha
   */
  MODERN_RGB_ALPHA:
    /^rgba?\(\s*((?:\d{1,3}(?:\.\d+)?%?|\.\d+%?|var\([^)]+\)))\s+((?:\d{1,3}(?:\.\d+)?%?|\.\d+%?|var\([^)]+\)))\s+((?:\d{1,3}(?:\.\d+)?%?|\.\d+%?|var\([^)]+\)))\s*(?:\/\s*((?:0|1|0?\.\d+|\.\d+|\d{1,3}%?|var\([^)]+\))))?\s*\)$/i,
} as const;

/**
 * Enhanced RGB/RGBA parsing function
 * @param colorString - RGB/RGBA color string
 * @returns Parsed RGBA values or null if invalid
 */
export const parseRgbaColor = (
  colorString: string
): [number, number, number, number] | null => {
  const str = colorString.trim().toLowerCase();

  // Return null for empty strings or CSS variables
  if (!str || str.includes('var(')) {
    return null;
  }

  // Helper to parse a single color component (r, g, or b)
  const parseComponent = (component: string | undefined): number | null => {
    if (!component) return null;

    const trimmed = component.trim();
    if (!trimmed || trimmed.includes('var(')) return null;

    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      if (isNaN(percent)) return null;
      // Clamp percentage to 0-100 range, then convert to 0-255
      const clamped = Math.max(0, Math.min(100, percent));
      return Math.round((clamped * 255) / 100);
    }

    const num = parseFloat(trimmed);
    if (isNaN(num)) return null;
    return Math.round(Math.max(0, Math.min(255, num)));
  };

  // Helper to parse alpha component
  const parseAlpha = (alpha: string | undefined): number => {
    if (!alpha) return 1;

    const trimmed = alpha.trim();
    if (!trimmed || trimmed.includes('var(')) return 1;

    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      if (isNaN(percent)) return 1;
      return Math.max(0, Math.min(100, percent)) / 100;
    }

    const num = parseFloat(trimmed);
    if (isNaN(num)) return 1;
    return Math.max(0, Math.min(1, num));
  };

  // Pattern 1: Legacy comma-separated (must come first to properly handle percentages)
  // rgb(255, 0, 0) or rgba(255, 0, 0, 0.5) or rgba(255, 0, 0, 50%)
  // Also handles rgb(100%, 0%, 0%)
  const legacyCommaPattern =
    /^rgba?\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*(?:,\s*([^\)]+))?\s*\)$/;
  let match = str.match(legacyCommaPattern);
  if (match) {
    const r = parseComponent(match[1]);
    const g = parseComponent(match[2]);
    const b = parseComponent(match[3]);
    const a = parseAlpha(match[4]);

    if (r !== null && g !== null && b !== null) {
      return [r, g, b, a];
    }
  }

  // Pattern 2: Modern space-separated with slash alpha
  // rgb(255 0 0 / 0.5) or rgba(255 0 0 / 50%)
  const modernSlashPattern =
    /^rgba?\(\s*([^\s\/]+)\s+([^\s\/]+)\s+([^\s\/]+)\s*(?:\/\s*([^\)]+))?\s*\)$/;
  match = str.match(modernSlashPattern);
  if (match) {
    const r = parseComponent(match[1]);
    const g = parseComponent(match[2]);
    const b = parseComponent(match[3]);
    const a = parseAlpha(match[4]);

    if (r !== null && g !== null && b !== null) {
      return [r, g, b, a];
    }
  }

  // Pattern 3: Modern space-separated without slash (rgb only, no alpha)
  // rgb(255 0 0)
  const modernSpacePattern = /^rgb\(\s*([^\s,]+)\s+([^\s,]+)\s+([^\s,]+)\s*\)$/;
  match = str.match(modernSpacePattern);
  if (match) {
    const r = parseComponent(match[1]);
    const g = parseComponent(match[2]);
    const b = parseComponent(match[3]);

    if (r !== null && g !== null && b !== null) {
      return [r, g, b, 1];
    }
  }

  return null;
};

/**
 * Enhanced color pattern collection with improved RGB support
 */
export const COLOR_PATTERNS = {
  // Hex patterns (unchanged)
  HEX: /^#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/,

  // RGB patterns (enhanced)
  RGB: RGB_PATTERNS.COMPREHENSIVE,

  // HSL patterns (supports both hsl and hsla)
  HSL: /^hsla?\(\s*(\d+(?:\.\d+)?)(?:deg|rad|grad|turn)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // OKLCH pattern
  OKLCH:
    /^oklch\(\s*(\d+(?:\.\d+)?%?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // OKLAB pattern
  OKLAB:
    /^oklab\(\s*(\d+(?:\.\d+)?%?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)(?:\s+[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // HSV pattern
  HSV: /^hsv\(\s*(\d+(?:\.\d+)?)(?:deg|rad|grad|turn)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // CMYK pattern
  CMYK: /^cmyk\(\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // CSS color() function
  COLOR_FUNCTION:
    /^color\(\s*([a-z]+)\s+((?:\d+(?:\.\d+)?%?\s+)*\d+(?:\.\d+)?%?)(?:\s*[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // Lab color
  LAB: /^lab\(\s*(\d+(?:\.\d+)?%?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)(?:\s*[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,

  // LCH color
  LCH: /^lch\(\s*(\d+(?:\.\d+)?%?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s*[,\s/]\s*(\d*\.?\d+%?))?\s*\)$/i,
} as const;

/**
 * Test RGB/RGBA strings against all patterns
 * @param colorString - Color string to test
 * @returns Array of matching pattern names
 */
export const testRgbaPatterns = (colorString: string): string[] => {
  const matches: string[] = [];
  const str = colorString.trim();

  Object.entries(RGB_PATTERNS).forEach(([name, pattern]) => {
    if (pattern.test(str)) {
      matches.push(name);
    }
  });

  return matches;
};

/**
 * Enhanced parseColor function with better RGB support
 */
export const parseColor = (
  color: string
): [number, number, number, number] | null => {
  if (!color || typeof color !== 'string') {
    return null;
  }

  const str = color.trim().toLowerCase();

  if (!str) {
    return null;
  }

  if (str === 'transparent') {
    return [0, 0, 0, 0];
  }

  const namedColor = str as NamedColor;
  if (NAMED_COLORS[namedColor]) {
    return parseColor(NAMED_COLORS[namedColor]);
  }

  // Try RGB/RGBA parsing first (most common for programmatic use)
  const rgba = parseRgbaColor(str);
  if (rgba) {
    return rgba;
  }

  // Try hex colors
  const hexMatch = str.match(COLOR_PATTERNS.HEX);
  if (hexMatch) {
    let hex = hexMatch[1];

    // Expand shorthand hex (#RGB or #RGBA to #RRGGBB or #RRGGBBAA)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

    // Validate parsed values
    if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
      return [r, g, b, a];
    }
  }

  // Try HSL colors
  const hslMatch = str.match(COLOR_PATTERNS.HSL);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const a = hslMatch[4] ? parsePercentage(hslMatch[4]) : 1;

    if (!isNaN(h) && !isNaN(s) && !isNaN(l) && !isNaN(a)) {
      // Convert HSL to RGB
      return hslToRgb(h, s, l, a);
    }
  }

  // Try OKLCH colors
  const oklchMatch = str.match(COLOR_PATTERNS.OKLCH);
  if (oklchMatch) {
    const L = parsePercentage(oklchMatch[1]);
    const C = parseFloat(oklchMatch[2]);
    const H = parseFloat(oklchMatch[3]);
    const a = oklchMatch[4] ? parsePercentage(oklchMatch[4]) : 1;

    if (!isNaN(L) && !isNaN(C) && !isNaN(H) && !isNaN(a)) {
      // Convert OKLCH to RGB
      return oklchToRgb(L, C, H, a);
    }
  }

  return null;
};

export const hslToRgb = (
  h: number,
  s: number,
  l: number,
  a: number = 1
): [number, number, number, number] => {
  h = h % 360;
  if (h < 0) h += 360;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else if (h >= 300 && h < 360) {
    [r, g, b] = [c, 0, x];
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    a,
  ];
};

/**
 * Convert OKLCH to RGB (simplified approximation)
 */
export const oklchToRgb = (
  L: number,
  C: number,
  H: number,
  a: number = 1
): [number, number, number, number] => {
  // This is a simplified approximation
  // Real conversion is complex and requires proper color space conversion
  const hue = H % 360;
  const saturation = Math.min(100, C * 100);
  const lightness = L * 100;

  return hslToRgb(hue, saturation / 100, lightness / 100, a);
};

/**
 * Formats RGBA values into a CSS rgba() or rgb() string
 * @param r - Red value (0-255) or CSS variable
 * @param g - Green value (0-255) or CSS variable
 * @param b - Blue value (0-255) or CSS variable
 * @param a - Alpha value (0-1) or CSS variable (default: 1)
 * @returns Formatted rgba string
 * @example
 * formatRgba(255, 0, 0, 0.5) // returns "rgba(255, 0, 0, 0.5)"
 * formatRgba(255, 0, 0, 'var(--opacity)') // returns "rgba(255, 0, 0, var(--opacity))"
 */
export const formatRgba = <
  R extends number | string,
  G extends number | string,
  B extends number | string,
  A extends number | string = 1
>(
  r: R,
  g: G,
  b: B,
  a: A = 1 as A
): string => {
  // Handle non-numeric or CSS variable values
  const isVariable = (value: any): boolean =>
    typeof value === 'string' && value.includes('var(');

  const isAlphaVariable = isVariable(a);
  const hasAlpha = isAlphaVariable || (typeof a === 'number' && a !== 1);

  // Use modern CSS syntax with spaces and slash for alpha
  if (hasAlpha) {
    return `rgba(${r} ${g} ${b} / ${a})`;
  }

  return `rgb(${r} ${g} ${b})`;
};

/**
 * Converts a numeric value to a two-digit hex string
 * @param value - Number between 0-255
 * @returns Two-digit hex string
 * @private
 */
const numToHex = (value: number): string => {
  const hex = Math.round(value).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

/**
 * Converts a percentage string to a number
 * @param value - Percentage string (e.g., "50%")
 * @returns Number between 0-1
 * @private
 */
const parsePercentage = (value: string): number => {
  if (value.endsWith('%')) {
    return parseFloat(value) / 100;
  }
  return parseFloat(value);
};

/**
 * Parses any color string to RGBA values
 * @param color - Color string in any supported format
 * @returns RGBA array [r, g, b, a] or null if invalid
 */

//     // Expand shorthand hex
//     if (hex.length === 3 || hex.length === 4) {
//       hex = hex
//         .split('')
//         .map((c) => c + c)
//         .join('');
//     }

/**
 * Validates if a string is a valid color
 * @param color - Color string to validate
 * @returns True if valid color
 */
export const isValidColor = (color: string): boolean => {
  if (color.toLowerCase() in NAMED_COLORS) {
    return true;
  }

  // For RGB/RGBA, delegate to the actual parser to ensure proper validation
  if (color.toLowerCase().trim().startsWith('rgb')) {
    return parseRgbaColor(color) !== null;
  }

  // Check other patterns (HSL, hex, etc.)
  const { RGB, ...otherPatterns } = COLOR_PATTERNS;
  return Object.values(otherPatterns).some((pattern) => pattern.test(color));
};

/**
 * Converts RGBA values to hex string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns Hex color string
 */
export const rgbaToHex = (
  r: number,
  g: number,
  b: number,
  a: number = 1
): string => {
  const hex = `#${numToHex(r)}${numToHex(g)}${numToHex(b)}`;
  return a < 1 ? `${hex}${numToHex(Math.round(a * 255))}` : hex;
};

/**
 * Converts RGBA values to HSL string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns HSL/HSLA color string
 */
export const rgbaToHsl = (
  r: number,
  g: number,
  b: number,
  a: number = 1
): string => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }

    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  if (a === 1) {
    return `hsl(${h}, ${s}%, ${lPercent}%)`;
  }

  return `hsla(${h}, ${s}%, ${lPercent}%, ${a})`;
};

/**
 * Converts RGBA values to HSV string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns HSV/HSVA color string
 */
export const rgbaToHsv = (
  r: number,
  g: number,
  b: number,
  a: number = 1
): string => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  h = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const vPercent = Math.round(v * 100);

  if (a === 1) {
    return `hsv(${h}, ${sPercent}%, ${vPercent}%)`;
  }

  return `hsva(${h}, ${sPercent}%, ${vPercent}%, ${a})`;
};

/**
 * Converts RGBA values to CMYK string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns CMYK color string
 */
export const rgbaToCmyk = (
  r: number,
  g: number,
  b: number,
  a: number = 1
): string => {
  if (r === 0 && g === 0 && b === 0) {
    return `cmyk(0%, 0%, 0%, 100%)`;
  }

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);

  const cPercent = Math.round(c * 100);
  const mPercent = Math.round(m * 100);
  const yPercent = Math.round(y * 100);
  const kPercent = Math.round(k * 100);

  return `cmyk(${cPercent}%, ${mPercent}%, ${yPercent}%, ${kPercent}%)`;
};

/**
 * Calculates relative luminance for contrast ratio
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance (0-1)
 * @private
 */
export const calculateLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculates contrast ratio between two colors
 * @param color1 - First color string
 * @param color2 - Second color string
 * @returns Contrast ratio (1-21)
 */
export const calculateContrastRatio = (
  color1: string,
  color2: string
): number => {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) {
    return 1;
  }

  const l1 = calculateLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = calculateLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Adjusts color based on options
 * @param color - Input color string
 * @param options - Adjustment options
 * @returns Adjusted color string
 */
export const adjustColor = (
  color: string,
  options: ColorAdjustmentOptions
): string => {
  const rgb = parseColor(color);
  if (!rgb) return color;

  let [r, g, b, a] = rgb;

  // Adjust alpha
  if (options.alpha !== undefined) {
    a = Math.max(0, Math.min(1, options.alpha));
  }

  // Convert to HSL for hue/saturation/lightness adjustments
  let h = 0,
    s = 0,
    l = 0;

  if (
    options.lightness !== undefined ||
    options.saturation !== undefined ||
    options.hue !== undefined
  ) {
    // Convert RGB to HSL
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);

    l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case rNorm:
          h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
          break;
        case gNorm:
          h = (bNorm - rNorm) / d + 2;
          break;
        case bNorm:
          h = (rNorm - gNorm) / d + 4;
          break;
      }

      h /= 6;
    }

    h *= 360;
    s *= 100;
    l *= 100;

    // Apply adjustments
    if (options.hue !== undefined) {
      h = (h + options.hue) % 360;
      if (h < 0) h += 360;
    }

    if (options.saturation !== undefined) {
      s = Math.max(0, Math.min(100, s + options.saturation));
    }

    if (options.lightness !== undefined) {
      l = Math.max(0, Math.min(100, l + options.lightness));
    }

    // Convert back to RGB
    const hNorm = h / 360;
    const sNorm = s / 100;
    const lNorm = l / 100;

    const chroma = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = chroma * (1 - Math.abs(((hNorm * 6) % 2) - 1));
    const m = lNorm - chroma / 2;

    let rNorm2 = 0,
      gNorm2 = 0,
      bNorm2 = 0;

    if (hNorm < 1 / 6) {
      [rNorm2, gNorm2, bNorm2] = [chroma, x, 0];
    } else if (hNorm < 2 / 6) {
      [rNorm2, gNorm2, bNorm2] = [x, chroma, 0];
    } else if (hNorm < 3 / 6) {
      [rNorm2, gNorm2, bNorm2] = [0, chroma, x];
    } else if (hNorm < 4 / 6) {
      [rNorm2, gNorm2, bNorm2] = [0, x, chroma];
    } else if (hNorm < 5 / 6) {
      [rNorm2, gNorm2, bNorm2] = [x, 0, chroma];
    } else {
      [rNorm2, gNorm2, bNorm2] = [chroma, 0, x];
    }

    r = Math.round((rNorm2 + m) * 255);
    g = Math.round((gNorm2 + m) * 255);
    b = Math.round((bNorm2 + m) * 255);
  }

  // Adjust contrast
  if (options.contrast !== undefined) {
    const factor = (options.contrast / 100) * 2.55; // Convert to 0-255 range factor
    const avg = (r + g + b) / 3;

    r = Math.round(avg + (r - avg) * (1 + factor));
    g = Math.round(avg + (g - avg) * (1 + factor));
    b = Math.round(avg + (b - avg) * (1 + factor));

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
  }

  return rgbaToHex(r, g, b, a);
};

/**
 * Mixes two colors
 * @param options - Mixing options
 * @returns Mixed color string
 */
export const mixColors = (options: ColorMixOptions): string => {
  const {
    color,
    with: mixColor = 'transparent',
    percentage = 50,
    colorSpace = 'srgb',
  } = options;

  const rgb1 = parseColor(color);
  const rgb2 = parseColor(mixColor);

  if (!rgb1 || !rgb2) {
    return color;
  }

  const factor = percentage / 100;

  let [r1, g1, b1, a1] = rgb1;
  let [r2, g2, b2, a2] = rgb2;

  // Apply opacities if provided
  if (options.opacity !== undefined) {
    a1 =
      typeof options.opacity === 'number'
        ? options.opacity
        : parsePercentage(options.opacity);
  }

  if (options.withOpacity !== undefined) {
    a2 =
      typeof options.withOpacity === 'number'
        ? options.withOpacity
        : parsePercentage(options.withOpacity);
  }

  // Mix based on color space
  switch (colorSpace) {
    case 'srgb':
    default:
      // Simple linear interpolation in RGB
      const r = Math.round(r1 + (r2 - r1) * factor);
      const g = Math.round(g1 + (g2 - g1) * factor);
      const b = Math.round(b1 + (b2 - b1) * factor);
      const a = a1 + (a2 - a1) * factor;

      return rgbaToHex(r, g, b, a);

    case 'hsl':
      // Mix in HSL space
      const hsl1 = parseColor(rgbaToHsl(r1, g1, b1, a1));
      const hsl2 = parseColor(rgbaToHsl(r2, g2, b2, a2));

      if (!hsl1 || !hsl2) {
        return color;
      }

      // Simplified HSL mixing - in practice would need proper HSL interpolation
      const h = (hsl1[0] + (hsl2[0] - hsl1[0]) * factor) % 360;
      const s = hsl1[1] + (hsl2[1] - hsl1[1]) * factor;
      const l = hsl1[2] + (hsl2[2] - hsl1[2]) * factor;

      return `hsl(${h}, ${s}%, ${l}%)`;
  }
};

/**
 * Generates a color palette from a base color
 * @param baseColor - Base color string
 * @param options - Palette generation options
 * @returns Object with color shades
 */
export const generatePalette = (
  baseColor: string,
  options: PaletteOptions = {}
): Record<string, string> => {
  const rgb = parseColor(baseColor);
  if (!rgb) return {};

  const shades = options.shades || 10;
  const lightnessFactor = options.lightnessFactor || 0.1;
  const saturationFactor = options.saturationFactor || 0.05;

  const palette: Record<string, string> = {};

  // Generate shades
  for (let i = 0; i < shades; i++) {
    const position = i / (shades - 1); // 0 to 1
    const lightnessAdjustment = (position - 0.5) * 2 * lightnessFactor * 100; // -100 to 100

    const shadeColor = adjustColor(baseColor, {
      lightness: lightnessAdjustment,
      saturation: (position - 0.5) * 2 * saturationFactor * 100,
    });

    const key = i === 0 ? '50' : `${i * 100}`;
    palette[key] = shadeColor;
  }

  // Generate complementary colors if requested
  if (options.includeComplementary) {
    const hsl = parseColor(rgbaToHsl(rgb[0], rgb[1], rgb[2]));
    if (hsl) {
      let h = hsl[0];
      h = (h + 180) % 360;
      palette.complementary = `hsl(${h}, ${hsl[1]}%, ${hsl[2]}%)`;
    }
  }

  // Generate analogous colors (30° apart)
  if (options.includeAnalogous) {
    const hsl = parseColor(rgbaToHsl(rgb[0], rgb[1], rgb[2]));
    if (hsl) {
      let h = hsl[0];
      palette.analogous1 = `hsl(${(h - 30 + 360) % 360}, ${hsl[1]}%, ${
        hsl[2]
      }%)`;
      palette.analogous2 = `hsl(${(h + 30) % 360}, ${hsl[1]}%, ${hsl[2]}%)`;
    }
  }

  // Generate triadic colors (120° apart)
  if (options.includeTriadic) {
    const hsl = parseColor(rgbaToHsl(rgb[0], rgb[1], rgb[2]));
    if (hsl) {
      let h = hsl[0];
      palette.triadic1 = `hsl(${(h + 120) % 360}, ${hsl[1]}%, ${hsl[2]}%)`;
      palette.triadic2 = `hsl(${(h + 240) % 360}, ${hsl[1]}%, ${hsl[2]}%)`;
    }
  }

  return palette;
};

/**
 * Creates a contrasting color for accessibility
 * @param color - Base color string
 * @param options - Contrast options
 * @returns Contrasting color string
 */
export const createContrastColor = (
  color: string,
  options: ContrastOptions = {}
): string => {
  const {
    lightColor = '#ffffff',
    darkColor = '#000000',
    targetRatio = 4.5,
    fallbackColor = '#000000',
  } = options;

  const rgb = parseColor(color);
  if (!rgb) return fallbackColor;

  const luminance = calculateLuminance(rgb[0], rgb[1], rgb[2]);

  // Calculate contrast with light and dark colors
  const lightLuminance = calculateLuminance(
    ...(parseColor(lightColor)!.slice(0, 3) as [number, number, number])
  );
  const darkLuminance = calculateLuminance(
    ...(parseColor(darkColor)!.slice(0, 3) as [number, number, number])
  );

  const lightContrast =
    (Math.max(luminance, lightLuminance) + 0.05) /
    (Math.min(luminance, lightLuminance) + 0.05);

  const darkContrast =
    (Math.max(luminance, darkLuminance) + 0.05) /
    (Math.min(luminance, darkLuminance) + 0.05);

  // Return color with best contrast that meets target ratio
  if (lightContrast >= targetRatio && darkContrast >= targetRatio) {
    return lightContrast > darkContrast ? lightColor : darkColor;
  } else if (lightContrast >= targetRatio) {
    return lightColor;
  } else if (darkContrast >= targetRatio) {
    return darkColor;
  }

  // If neither meets target, return the one with better contrast
  return lightContrast > darkContrast ? lightColor : darkColor;
};
