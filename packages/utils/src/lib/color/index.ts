/**
 * @fileoverview Color utilities module
 * Comprehensive color management system with support for multiple color formats,
 * conversions, manipulations, and advanced operations.
 */

// Core color class and types
export * from './color.js';
export * from './types.js';
export * from './constants.js';

// Conversion utilities
export * from './conversions.js';

// Helper utilities
export * from './helpers.js';

// Main utility functions
export {
  RGB_PATTERNS,
  parseRgbaColor,
  parseColor,
  formatRgba,
  isValidColor,
  rgbaToHex,
  rgbaToHsl,
  rgbaToHsv,
  rgbaToCmyk,
  calculateLuminance,
  calculateContrastRatio,
  adjustColor,
  mixColors,
  generatePalette,
  createContrastColor,
} from './utils.js';
