/**
 * @fileoverview Comprehensive color management utility with support for multiple color formats,
 * conversions, and color manipulation operations.
 */
import type { ColorAdjustmentOptions, ColorMixOptions, PaletteOptions, ContrastOptions } from './types.js';
/**
 * Comprehensive RGB/RGBA regex patterns
 */
export declare const RGB_PATTERNS: {
    /**
     * Matches legacy comma-separated RGB
     * @example rgb(255, 0, 0)
     */
    readonly LEGACY_RGB: RegExp;
    /**
     * Matches modern space-separated RGB
     * @example rgb(255 0 0)
     */
    readonly MODERN_RGB: RegExp;
    /**
     * Matches legacy comma-separated RGBA
     * @example rgba(255, 0, 0, 0.5)
     * @example rgba(255, 0, 0, 50%)
     */
    readonly LEGACY_RGBA: RegExp;
    /**
     * Matches modern space-separated RGBA with slash
     * @example rgb(255 0 0 / 0.5)
     * @example rgb(255 0 0 / 50%)
     * @example rgba(255 0 0 / 0.5)
     */
    readonly MODERN_RGBA: RegExp;
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
    readonly COMPREHENSIVE: RegExp;
    /**
     * Strict RGB pattern with validation
     * Matches integers (0-255) or percentages (0-100%)
     */
    readonly STRICT_RGB: RegExp;
    /**
     * Strict RGBA pattern with validation
     */
    readonly STRICT_RGBA: RegExp;
    /**
     * Modern RGB with optional alpha
     */
    readonly MODERN_RGB_ALPHA: RegExp;
};
/**
 * Enhanced RGB/RGBA parsing function
 * @param colorString - RGB/RGBA color string
 * @returns Parsed RGBA values or null if invalid
 */
export declare const parseRgbaColor: (colorString: string) => [number, number, number, number] | null;
/**
 * Enhanced color pattern collection with improved RGB support
 */
export declare const COLOR_PATTERNS: {
    readonly HEX: RegExp;
    readonly RGB: RegExp;
    readonly HSL: RegExp;
    readonly OKLCH: RegExp;
    readonly OKLAB: RegExp;
    readonly HSV: RegExp;
    readonly CMYK: RegExp;
    readonly COLOR_FUNCTION: RegExp;
    readonly LAB: RegExp;
    readonly LCH: RegExp;
};
/**
 * Test RGB/RGBA strings against all patterns
 * @param colorString - Color string to test
 * @returns Array of matching pattern names
 */
export declare const testRgbaPatterns: (colorString: string) => string[];
/**
 * Enhanced parseColor function with better RGB support
 */
export declare const parseColor: (color: string) => [number, number, number, number] | null;
/**
 * Convert HSL to RGB
 */
export declare const hslToRgb: (h: number, s: number, l: number, a?: number) => [number, number, number, number];
/**
 * Convert OKLCH to RGB (simplified approximation)
 */
export declare const oklchToRgb: (L: number, C: number, H: number, a?: number) => [number, number, number, number];
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
export declare const formatRgba: <R extends number | string, G extends number | string, B extends number | string, A extends number | string = 1>(r: R, g: G, b: B, a?: A) => string;
/**
 * Parses any color string to RGBA values
 * @param color - Color string in any supported format
 * @returns RGBA array [r, g, b, a] or null if invalid
 */
/**
 * Validates if a string is a valid color
 * @param color - Color string to validate
 * @returns True if valid color
 */
export declare const isValidColor: (color: string) => boolean;
/**
 * Converts RGBA values to hex string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns Hex color string
 */
export declare const rgbaToHex: (r: number, g: number, b: number, a?: number) => string;
/**
 * Converts RGBA values to HSL string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns HSL/HSLA color string
 */
export declare const rgbaToHsl: (r: number, g: number, b: number, a?: number) => string;
/**
 * Converts RGBA values to HSV string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns HSV/HSVA color string
 */
export declare const rgbaToHsv: (r: number, g: number, b: number, a?: number) => string;
/**
 * Converts RGBA values to CMYK string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (0-1)
 * @returns CMYK color string
 */
export declare const rgbaToCmyk: (r: number, g: number, b: number, a?: number) => string;
/**
 * Calculates relative luminance for contrast ratio
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance (0-1)
 * @private
 */
export declare const calculateLuminance: (r: number, g: number, b: number) => number;
/**
 * Calculates contrast ratio between two colors
 * @param color1 - First color string
 * @param color2 - Second color string
 * @returns Contrast ratio (1-21)
 */
export declare const calculateContrastRatio: (color1: string, color2: string) => number;
/**
 * Adjusts color based on options
 * @param color - Input color string
 * @param options - Adjustment options
 * @returns Adjusted color string
 */
export declare const adjustColor: (color: string, options: ColorAdjustmentOptions) => string;
/**
 * Mixes two colors
 * @param options - Mixing options
 * @returns Mixed color string
 */
export declare const mixColors: (options: ColorMixOptions) => string;
/**
 * Generates a color palette from a base color
 * @param baseColor - Base color string
 * @param options - Palette generation options
 * @returns Object with color shades
 */
export declare const generatePalette: (baseColor: string, options?: PaletteOptions) => Record<string, string>;
/**
 * Creates a contrasting color for accessibility
 * @param color - Base color string
 * @param options - Contrast options
 * @returns Contrasting color string
 */
export declare const createContrastColor: (color: string, options?: ContrastOptions) => string;
//# sourceMappingURL=utils.d.ts.map