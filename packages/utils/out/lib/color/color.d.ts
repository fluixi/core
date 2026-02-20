import type { ColorAdjustmentOptions, ColorSpace, ContrastOptions, PaletteOptions, ColorFormat, RGBColor, HSLColor, HSVColor, HWBColor, CMYKColor, LABColor, LCHColor, OKLABColor, OKLCHColor, XYZColor, ColorConversionOptions, ColorHarmonyOptions } from './types.js';
import { RGB_PATTERNS } from './utils.js';
/**
 * Represents a color in various formats
 */
export type ColorRepresentation = string | number[] | RGBColor | HSLColor | HSVColor | HWBColor | CMYKColor | LABColor | LCHColor | OKLABColor | OKLCHColor | XYZColor | Color;
/**
 * Color class for object-oriented color manipulation
 */
export declare class Color {
    private _r;
    private _g;
    private _b;
    private _a;
    /**
     * Parse any RGB/RGBA format
     */
    static parseRgbString(colorString: string): [number, number, number, number] | null;
    /**
     * Check if string matches any RGB pattern
     */
    static isRgbFormat(colorString: string): boolean;
    /**
     * Get the specific RGB pattern that matches
     */
    static getRgbPatternMatch(colorString: string): keyof typeof RGB_PATTERNS | null;
    /**
     * Convert RGB values to modern CSS syntax
     */
    static toModernRgbSyntax(r: number | string, g: number | string, b: number | string, a?: number | string): string;
    /**
     * Convert RGB values to legacy syntax
     */
    static toLegacyRgbSyntax(r: number | string, g: number | string, b: number | string, a?: number | string): string;
    /**
     * Normalize RGB string to a consistent format
     */
    static normalizeRgbString(colorString: string, format?: 'modern' | 'legacy'): string | null;
    /**
     * Creates a new Color instance
     * @param color - Color representation (string, array, object, or another Color)
     */
    constructor(color?: ColorRepresentation);
    /**
     * Sets the color from any representation
     * @param color - Color representation
     * @returns This Color instance for chaining
     */
    set(color: ColorRepresentation): this;
    /**
     * Clamps color values to valid ranges
     * @private
     */
    private _clamp;
    /**
     * Gets the red component
     */
    get r(): number;
    /**
     * Sets the red component
     */
    set r(value: number);
    /**
     * Gets the green component
     */
    get g(): number;
    /**
     * Sets the green component
     */
    set g(value: number);
    /**
     * Gets the blue component
     */
    get b(): number;
    /**
     * Sets the blue component
     */
    set b(value: number);
    /**
     * Gets the alpha component
     */
    get a(): number;
    /**
     * Sets the alpha component
     */
    set a(value: number);
    /**
     * Gets the RGB array
     */
    get rgb(): [number, number, number];
    /**
     * Gets the RGBA array
     */
    get rgba(): [number, number, number, number];
    /**
     * Converts to hex string
     * @returns Hex color string
     */
    toHex(): string;
    /**
     * Converts to RGB string
     * @returns RGB color string
     */
    toRgb(): string;
    /**
     * Converts to RGBA string
     * @returns RGBA color string
     */
    toRgba(): string;
    /**
     * Gets RGB object
     * @returns RGB color object
     */
    getRgbObject(): RGBColor;
    /**
     * Converts to HSL string
     * @returns HSL/HSLA color string
     */
    toHsl(): string;
    /**
     * Gets HSL object
     * @returns HSL color object
     */
    getHslObject(): HSLColor;
    /**
     * Converts to HSV string
     * @returns HSV/HSVA color string
     */
    toHsv(): string;
    /**
     * Gets HSV object
     * @returns HSV color object
     */
    getHsvObject(): HSVColor;
    /**
     * Converts to HWB string
     * @returns HWB color string
     */
    toHwb(): string;
    /**
     * Gets HWB object
     * @returns HWB color object
     */
    getHwbObject(): HWBColor;
    /**
     * Converts to CMYK string
     * @returns CMYK color string
     */
    toCmyk(): string;
    /**
     * Gets CMYK object
     * @returns CMYK color object
     */
    getCmykObject(): CMYKColor;
    /**
     * Converts to XYZ string
     * @returns XYZ color string
     */
    toXyz(): string;
    /**
     * Gets XYZ object
     * @returns XYZ color object
     */
    getXyzObject(): XYZColor;
    /**
     * Converts to LAB string
     * @returns LAB color string
     */
    toLab(): string;
    /**
     * Gets LAB object
     * @returns LAB color object
     */
    getLabObject(): LABColor;
    /**
     * Converts to LCH string
     * @returns LCH color string
     */
    toLch(): string;
    /**
     * Gets LCH object
     * @returns LCH color object
     */
    getLchObject(): LCHColor;
    /**
     * Converts to OKLAB string
     * @returns OKLAB color string
     */
    toOklab(): string;
    /**
     * Gets OKLAB object
     * @returns OKLAB color object
     */
    getOklabObject(): OKLABColor;
    /**
     * Converts to OKLCH string
     * @returns OKLCH color string
     */
    toOklch(): string;
    /**
     * Gets OKLCH object
     * @returns OKLCH color object
     */
    getOklchObject(): OKLCHColor;
    /**
     * Adjusts the color
     * @param options - Adjustment options
     * @returns This Color instance for chaining
     */
    adjust(options: ColorAdjustmentOptions): this;
    /**
     * Lightens the color
     * @param amount - Lighten amount (0-100)
     * @returns This Color instance for chaining
     */
    lighten(amount: number): this;
    /**
     * Darkens the color
     * @param amount - Darken amount (0-100)
     * @returns This Color instance for chaining
     */
    darken(amount: number): this;
    /**
     * Saturates the color
     * @param amount - Saturate amount (0-100)
     * @returns This Color instance for chaining
     */
    saturate(amount: number): this;
    /**
     * Desaturates the color
     * @param amount - Desaturate amount (0-100)
     * @returns This Color instance for chaining
     */
    desaturate(amount: number): this;
    /**
     * Rotates the hue
     * @param degrees - Hue rotation in degrees
     * @returns This Color instance for chaining
     */
    rotate(degrees: number): this;
    /**
     * Sets the alpha value
     * @param alpha - Alpha value (0-1)
     * @returns This Color instance for chaining
     */
    alpha(alpha: number): this;
    /**
     * Mixes with another color
     * @param color - Color to mix with
     * @param percentage - Mix percentage (0-100)
     * @param colorSpace - Color space for mixing
     * @returns This Color instance for chaining
     */
    mix(color: string, percentage?: number, colorSpace?: ColorSpace): this;
    /**
     * Gets the contrasting color
     * @param options - Contrast options
     * @returns Contrasting Color instance
     */
    getContrastColor(options?: ContrastOptions): Color;
    /**
     * Gets the relative luminance
     * @returns Relative luminance (0-1)
     */
    getLuminance(): number;
    /**
     * Calculates contrast ratio with another color
     * @param color - Color to compare with
     * @returns Contrast ratio (1-21)
     */
    getContrastRatio(color: string | Color): number;
    /**
     * Generates a palette from this color
     * @param options - Palette options
     * @returns Object with color shades
     */
    getPalette(options?: PaletteOptions): Record<string, string>;
    /**
     * Clones the color
     * @returns New Color instance with same values
     */
    clone(): Color;
    /**
     * Converts to string in specified format
     * @param format - Output format
     * @returns Color string
     */
    toString(format?: ColorFormat): string;
    /**
     * Convert to any format with options
     * @param format - Target format
     * @param options - Conversion options
     * @returns Converted color object
     */
    convertTo(format: ColorFormat, options?: ColorConversionOptions): any;
    /**
     * Set color from any color space object
     * @param color - Color object in any supported format
     * @returns This Color instance for chaining
     */
    setFromObject(color: RGBColor | HSLColor | HSVColor | HWBColor | CMYKColor | LABColor | LCHColor | OKLABColor | OKLCHColor | XYZColor): this;
    /**
     * Get color harmony colors
     * @param options - Harmony options
     * @returns Array of Color instances
     */
    getHarmony(options?: ColorHarmonyOptions): Color[];
    /**
     * Get supported color formats
     * @returns Array of supported format names
     */
    static getSupportedFormats(): string[];
    /**
     * Check if format is valid
     * @param format - Format to check
     * @returns True if format is supported
     */
    static isValidFormat(format: string): boolean;
    /**
     * Get conversion path between formats
     * @param from - Source format
     * @param to - Target format
     * @returns Array of formats in conversion path
     */
    static getConversionPath(from: string, to: string): string[] | null;
    /**
     * Checks if the color is valid
     * @returns True if color is valid
     */
    isValid(): boolean;
    /**
     * Creates a Color instance from string
     * @param color - Color string
     * @returns Color instance or null if invalid
     */
    static fromString(color: string): Color | null;
    /**
     * Creates a random Color
     * @returns Random Color instance
     */
    static random(): Color;
    /**
     * Predefined colors
     */
    static get transparent(): Color;
    static get white(): Color;
    static get black(): Color;
    static get red(): Color;
    static get green(): Color;
    static get blue(): Color;
    static get yellow(): Color;
    static get cyan(): Color;
    static get magenta(): Color;
    static get gray(): Color;
    static get lightGray(): Color;
    static get darkGray(): Color;
    static get orange(): Color;
    static get purple(): Color;
    static get pink(): Color;
    static get brown(): Color;
    static get teal(): Color;
    static get lime(): Color;
    static get indigo(): Color;
    static get violet(): Color;
}
//# sourceMappingURL=color.d.ts.map