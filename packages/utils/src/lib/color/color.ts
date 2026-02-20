import type {
  ColorAdjustmentOptions,
  ColorSpace,
  ContrastOptions,
  PaletteOptions,
  ColorFormat,
  RGBColor,
  HSLColor,
  HSVColor,
  HWBColor,
  CMYKColor,
  LABColor,
  LCHColor,
  OKLABColor,
  OKLCHColor,
  XYZColor,
  ColorConversionOptions,
  ColorHarmonyOptions,
} from './types.js';
import {
  adjustColor,
  calculateContrastRatio,
  calculateLuminance,
  createContrastColor,
  formatRgba,
  generatePalette,
  isValidColor,
  mixColors,
  parseColor,
  parseRgbaColor,
  RGB_PATTERNS,
  rgbaToCmyk,
  rgbaToHex,
  rgbaToHsl,
  rgbaToHsv,
} from './utils.js';
import {
  rgbToHsl,
  rgbToHsv,
  rgbToHwb,
  rgbToCmyk,
  rgbToXyz,
  rgbToLab,
  rgbToLch,
  rgbToOklab,
  rgbToOklch,
  hslToRgb,
  hsvToRgb,
  hwbToRgb,
  cmykToRgb,
  xyzToRgb,
  labToRgb,
  lchToRgb,
  oklabToRgb,
  oklchToRgb,
  convertColor,
  getSupportedFormats,
  isValidFormat,
  getConversionPath,
} from './conversions.js';

/**
 * Represents a color in various formats
 */
export type ColorRepresentation =
  | string
  | number[]
  | RGBColor
  | HSLColor
  | HSVColor
  | HWBColor
  | CMYKColor
  | LABColor
  | LCHColor
  | OKLABColor
  | OKLCHColor
  | XYZColor
  | Color;

/**
 * Color class for object-oriented color manipulation
 */
export class Color {
  private _r: number = 0;
  private _g: number = 0;
  private _b: number = 0;
  private _a: number = 1;
  /**
   * Parse any RGB/RGBA format
   */
  static parseRgbString(
    colorString: string
  ): [number, number, number, number] | null {
    return parseRgbaColor(colorString);
  }

  /**
   * Check if string matches any RGB pattern
   */
  static isRgbFormat(colorString: string): boolean {
    return Object.values(RGB_PATTERNS).some((pattern) =>
      pattern.test(colorString.trim())
    );
  }

  /**
   * Get the specific RGB pattern that matches
   */
  static getRgbPatternMatch(
    colorString: string
  ): keyof typeof RGB_PATTERNS | null {
    const str = colorString.trim();
    for (const [name, pattern] of Object.entries(RGB_PATTERNS)) {
      if (pattern.test(str)) {
        return name as keyof typeof RGB_PATTERNS;
      }
    }
    return null;
  }

  /**
   * Convert RGB values to modern CSS syntax
   */
  static toModernRgbSyntax(
    r: number | string,
    g: number | string,
    b: number | string,
    a?: number | string
  ): string {
    const components = [r, g, b];
    if (a !== undefined && a !== 1) {
      return `rgb(${components.join(' ')} / ${a})`;
    }
    return `rgb(${components.join(' ')})`;
  }

  /**
   * Convert RGB values to legacy syntax
   */
  static toLegacyRgbSyntax(
    r: number | string,
    g: number | string,
    b: number | string,
    a?: number | string
  ): string {
    const components = [r, g, b];
    if (a !== undefined && a !== 1) {
      return `rgba(${components.join(', ')}, ${a})`;
    }
    return `rgb(${components.join(', ')})`;
  }

  /**
   * Normalize RGB string to a consistent format
   */
  static normalizeRgbString(
    colorString: string,
    format: 'modern' | 'legacy' = 'modern'
  ): string | null {
    const rgba = parseRgbaColor(colorString);
    if (!rgba) return null;

    const [r, g, b, a] = rgba;

    if (format === 'modern') {
      return this.toModernRgbSyntax(r, g, b, a);
    } else {
      return this.toLegacyRgbSyntax(r, g, b, a);
    }
  }
  /**
   * Creates a new Color instance
   * @param color - Color representation (string, array, object, or another Color)
   */
  constructor(color: ColorRepresentation = '#000000') {
    this.set(color);
  }

  /**
   * Sets the color from any representation
   * @param color - Color representation
   * @returns This Color instance for chaining
   */
  set(color: ColorRepresentation): this {
    if (typeof color === 'string') {
      const rgb = parseColor(color);
      if (rgb) {
        [this._r, this._g, this._b, this._a] = rgb;
      }
    } else if (Array.isArray(color)) {
      [this._r = 0, this._g = 0, this._b = 0, this._a = 1] = color;
    } else if (color instanceof Color) {
      [this._r, this._g, this._b, this._a] = [
        color._r,
        color._g,
        color._b,
        color._a,
      ];
    } else if (typeof color === 'object') {
      // Handle all color space objects
      return this.setFromObject(color);
    }

    this._clamp();
    return this;
  }

  /**
   * Clamps color values to valid ranges
   * @private
   */
  private _clamp(): void {
    this._r = Math.max(0, Math.min(255, Math.round(this._r)));
    this._g = Math.max(0, Math.min(255, Math.round(this._g)));
    this._b = Math.max(0, Math.min(255, Math.round(this._b)));
    this._a = Math.max(0, Math.min(1, this._a));
  }

  /**
   * Gets the red component
   */
  get r(): number {
    return this._r;
  }

  /**
   * Sets the red component
   */
  set r(value: number) {
    this._r = value;
    this._clamp();
  }

  /**
   * Gets the green component
   */
  get g(): number {
    return this._g;
  }

  /**
   * Sets the green component
   */
  set g(value: number) {
    this._g = value;
    this._clamp();
  }

  /**
   * Gets the blue component
   */
  get b(): number {
    return this._b;
  }

  /**
   * Sets the blue component
   */
  set b(value: number) {
    this._b = value;
    this._clamp();
  }

  /**
   * Gets the alpha component
   */
  get a(): number {
    return this._a;
  }

  /**
   * Sets the alpha component
   */
  set a(value: number) {
    this._a = value;
    this._clamp();
  }

  /**
   * Gets the RGB array
   */
  get rgb(): [number, number, number] {
    return [this._r, this._g, this._b];
  }

  /**
   * Gets the RGBA array
   */
  get rgba(): [number, number, number, number] {
    return [this._r, this._g, this._b, this._a];
  }

  /**
   * Converts to hex string
   * @returns Hex color string
   */
  toHex(): string {
    return rgbaToHex(this._r, this._g, this._b, this._a);
  }

  /**
   * Converts to RGB string
   * @returns RGB color string
   */
  toRgb(): string {
    return formatRgba(this._r, this._g, this._b);
  }

  /**
   * Converts to RGBA string
   * @returns RGBA color string
   */
  toRgba(): string {
    return formatRgba(this._r, this._g, this._b, this._a);
  }

  /**
   * Gets RGB object
   * @returns RGB color object
   */
  getRgbObject(): RGBColor {
    return { r: this._r, g: this._g, b: this._b, a: this._a };
  }

  /**
   * Converts to HSL string
   * @returns HSL/HSLA color string
   */
  toHsl(): string {
    return rgbaToHsl(this._r, this._g, this._b, this._a);
  }

  /**
   * Gets HSL object
   * @returns HSL color object
   */
  getHslObject(): HSLColor {
    return rgbToHsl(this.getRgbObject());
  }

  /**
   * Converts to HSV string
   * @returns HSV/HSVA color string
   */
  toHsv(): string {
    return rgbaToHsv(this._r, this._g, this._b, this._a);
  }

  /**
   * Gets HSV object
   * @returns HSV color object
   */
  getHsvObject(): HSVColor {
    return rgbToHsv(this.getRgbObject());
  }

  /**
   * Converts to HWB string
   * @returns HWB color string
   */
  toHwb(): string {
    const hwb = rgbToHwb(this.getRgbObject());
    const alphaStr = this._a < 1 ? ` / ${Math.round(this._a * 100) / 100}` : '';
    return `hwb(${Math.round(hwb.h)} ${Math.round(hwb.w)}% ${Math.round(
      hwb.b
    )}%${alphaStr})`;
  }

  /**
   * Gets HWB object
   * @returns HWB color object
   */
  getHwbObject(): HWBColor {
    return rgbToHwb(this.getRgbObject());
  }

  /**
   * Converts to CMYK string
   * @returns CMYK color string
   */
  toCmyk(): string {
    return rgbaToCmyk(this._r, this._g, this._b, this._a);
  }

  /**
   * Gets CMYK object
   * @returns CMYK color object
   */
  getCmykObject(): CMYKColor {
    return rgbToCmyk(this.getRgbObject());
  }

  /**
   * Converts to XYZ string
   * @returns XYZ color string
   */
  toXyz(): string {
    const xyz = rgbToXyz(this.getRgbObject());
    const alphaStr = this._a < 1 ? ` / ${Math.round(this._a * 100) / 100}` : '';
    return `color(xyz ${xyz.x.toFixed(4)} ${xyz.y.toFixed(4)} ${xyz.z.toFixed(
      4
    )}${alphaStr})`;
  }

  /**
   * Gets XYZ object
   * @returns XYZ color object
   */
  getXyzObject(): XYZColor {
    return rgbToXyz(this.getRgbObject());
  }

  /**
   * Converts to LAB string
   * @returns LAB color string
   */
  toLab(): string {
    const lab = rgbToLab(this.getRgbObject());
    const alphaStr = this._a < 1 ? ` / ${Math.round(this._a * 100) / 100}` : '';
    return `lab(${lab.l.toFixed(2)}% ${lab.a.toFixed(2)} ${lab.b.toFixed(
      2
    )}${alphaStr})`;
  }

  /**
   * Gets LAB object
   * @returns LAB color object
   */
  getLabObject(): LABColor {
    return rgbToLab(this.getRgbObject());
  }

  /**
   * Converts to LCH string
   * @returns LCH color string
   */
  toLch(): string {
    const lch = rgbToLch(this.getRgbObject());
    const alphaStr = this._a < 1 ? ` / ${Math.round(this._a * 100) / 100}` : '';
    return `lch(${lch.l.toFixed(2)}% ${lch.c.toFixed(2)} ${lch.h.toFixed(
      2
    )}${alphaStr})`;
  }

  /**
   * Gets LCH object
   * @returns LCH color object
   */
  getLchObject(): LCHColor {
    return rgbToLch(this.getRgbObject());
  }

  /**
   * Converts to OKLAB string
   * @returns OKLAB color string
   */
  toOklab(): string {
    const oklab = rgbToOklab(this.getRgbObject());
    const alphaStr = this._a < 1 ? ` / ${Math.round(this._a * 100) / 100}` : '';
    return `oklab(${oklab.l.toFixed(4)} ${oklab.a.toFixed(4)} ${oklab.b.toFixed(
      4
    )}${alphaStr})`;
  }

  /**
   * Gets OKLAB object
   * @returns OKLAB color object
   */
  getOklabObject(): OKLABColor {
    return rgbToOklab(this.getRgbObject());
  }

  /**
   * Converts to OKLCH string
   * @returns OKLCH color string
   */
  toOklch(): string {
    const oklch = rgbToOklch(this.getRgbObject());
    const alphaStr = this._a < 1 ? ` / ${Math.round(this._a * 100) / 100}` : '';
    return `oklch(${oklch.l.toFixed(4)} ${oklch.c.toFixed(4)} ${oklch.h.toFixed(
      2
    )}${alphaStr})`;
  }

  /**
   * Gets OKLCH object
   * @returns OKLCH color object
   */
  getOklchObject(): OKLCHColor {
    return rgbToOklch(this.getRgbObject());
  }

  /**
   * Adjusts the color
   * @param options - Adjustment options
   * @returns This Color instance for chaining
   */
  adjust(options: ColorAdjustmentOptions): this {
    const adjusted = adjustColor(this.toHex(), options);
    this.set(adjusted);
    return this;
  }

  /**
   * Lightens the color
   * @param amount - Lighten amount (0-100)
   * @returns This Color instance for chaining
   */
  lighten(amount: number): this {
    return this.adjust({ lightness: amount });
  }

  /**
   * Darkens the color
   * @param amount - Darken amount (0-100)
   * @returns This Color instance for chaining
   */
  darken(amount: number): this {
    return this.adjust({ lightness: -amount });
  }

  /**
   * Saturates the color
   * @param amount - Saturate amount (0-100)
   * @returns This Color instance for chaining
   */
  saturate(amount: number): this {
    return this.adjust({ saturation: amount });
  }

  /**
   * Desaturates the color
   * @param amount - Desaturate amount (0-100)
   * @returns This Color instance for chaining
   */
  desaturate(amount: number): this {
    return this.adjust({ saturation: -amount });
  }

  /**
   * Rotates the hue
   * @param degrees - Hue rotation in degrees
   * @returns This Color instance for chaining
   */
  rotate(degrees: number): this {
    return this.adjust({ hue: degrees });
  }

  /**
   * Sets the alpha value
   * @param alpha - Alpha value (0-1)
   * @returns This Color instance for chaining
   */
  alpha(alpha: number): this {
    this._a = Math.max(0, Math.min(1, alpha));
    return this;
  }

  /**
   * Mixes with another color
   * @param color - Color to mix with
   * @param percentage - Mix percentage (0-100)
   * @param colorSpace - Color space for mixing
   * @returns This Color instance for chaining
   */
  mix(
    color: string,
    percentage: number = 50,
    colorSpace: ColorSpace = 'srgb'
  ): this {
    const mixed = mixColors({
      color: this.toHex(),
      with: color,
      percentage,
      colorSpace,
    });
    this.set(mixed);
    return this;
  }

  /**
   * Gets the contrasting color
   * @param options - Contrast options
   * @returns Contrasting Color instance
   */
  getContrastColor(options: ContrastOptions = {}): Color {
    const contrast = createContrastColor(this.toHex(), options);
    return new Color(contrast);
  }

  /**
   * Gets the relative luminance
   * @returns Relative luminance (0-1)
   */
  getLuminance(): number {
    return calculateLuminance(this._r, this._g, this._b);
  }

  /**
   * Calculates contrast ratio with another color
   * @param color - Color to compare with
   * @returns Contrast ratio (1-21)
   */
  getContrastRatio(color: string | Color): number {
    const otherColor = color instanceof Color ? color.toHex() : color;
    return calculateContrastRatio(this.toHex(), otherColor);
  }

  /**
   * Generates a palette from this color
   * @param options - Palette options
   * @returns Object with color shades
   */
  getPalette(options: PaletteOptions = {}): Record<string, string> {
    return generatePalette(this.toHex(), options);
  }

  /**
   * Clones the color
   * @returns New Color instance with same values
   */
  clone(): Color {
    return new Color(this.rgba);
  }

  /**
   * Converts to string in specified format
   * @param format - Output format
   * @returns Color string
   */
  toString(format: ColorFormat = 'hex'): string {
    switch (format) {
      case 'hex':
        return this.toHex();
      case 'rgb':
        return this.toRgb();
      case 'rgba':
        return this.toRgba();
      case 'hsl':
        return this.toHsl();
      case 'hsla':
        return this.toHsl();
      case 'hsv':
        return this.toHsv();
      case 'hsva':
        return this.toHsv();
      case 'hwb':
        return this.toHwb();
      case 'cmyk':
        return this.toCmyk();
      case 'xyz':
        return this.toXyz();
      case 'lab':
        return this.toLab();
      case 'lch':
        return this.toLch();
      case 'oklab':
        return this.toOklab();
      case 'oklch':
        return this.toOklch();
      default:
        return this.toHex();
    }
  }

  /**
   * Convert to any format with options
   * @param format - Target format
   * @param options - Conversion options
   * @returns Converted color object
   */
  convertTo(format: ColorFormat, options: ColorConversionOptions = {}): any {
    return convertColor(this.getRgbObject(), format, options);
  }

  /**
   * Set color from any color space object
   * @param color - Color object in any supported format
   * @returns This Color instance for chaining
   */
  setFromObject(
    color:
      | RGBColor
      | HSLColor
      | HSVColor
      | HWBColor
      | CMYKColor
      | LABColor
      | LCHColor
      | OKLABColor
      | OKLCHColor
      | XYZColor
  ): this {
    let rgb: RGBColor;

    if ('r' in color && 'g' in color && 'b' in color) {
      rgb = color as RGBColor;
    } else if ('h' in color && 's' in color && 'l' in color) {
      rgb = hslToRgb(color as HSLColor);
    } else if ('h' in color && 's' in color && 'v' in color) {
      rgb = hsvToRgb(color as HSVColor);
    } else if ('h' in color && 'w' in color && 'b' in color) {
      rgb = hwbToRgb(color as HWBColor);
    } else if ('c' in color && 'm' in color && 'y' in color && 'k' in color) {
      rgb = cmykToRgb(color as CMYKColor);
    } else if ('x' in color && 'y' in color && 'z' in color) {
      rgb = xyzToRgb(color as XYZColor);
    } else if ('l' in color && 'a' in color && 'b' in color) {
      rgb = labToRgb(color as LABColor);
    } else if ('l' in color && 'c' in color && 'h' in color) {
      // Check if it's OKLCH or LCH based on value ranges
      const lchColor = color as LCHColor;
      rgb =
        lchColor.l <= 1 ? oklchToRgb(color as OKLCHColor) : lchToRgb(lchColor);
    } else {
      throw new Error('Unknown color format');
    }

    this._r = rgb.r;
    this._g = rgb.g;
    this._b = rgb.b;
    this._a = rgb.a ?? 1;
    this._clamp();

    return this;
  }

  /**
   * Get color harmony colors
   * @param options - Harmony options
   * @returns Array of Color instances
   */
  getHarmony(options: ColorHarmonyOptions = {}): Color[] {
    const { type = 'complementary', count = 5, angleOffset = 30 } = options;
    const hsl = this.getHslObject();
    const colors: Color[] = [];

    switch (type) {
      case 'complementary':
        colors.push(
          new Color({ h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l, a: hsl.a })
        );
        break;

      case 'analogous':
        colors.push(
          new Color({
            h: (hsl.h - angleOffset + 360) % 360,
            s: hsl.s,
            l: hsl.l,
            a: hsl.a,
          }),
          new Color({
            h: (hsl.h + angleOffset) % 360,
            s: hsl.s,
            l: hsl.l,
            a: hsl.a,
          })
        );
        break;

      case 'triadic':
        colors.push(
          new Color({ h: (hsl.h + 120) % 360, s: hsl.s, l: hsl.l, a: hsl.a }),
          new Color({ h: (hsl.h + 240) % 360, s: hsl.s, l: hsl.l, a: hsl.a })
        );
        break;

      case 'tetradic':
        colors.push(
          new Color({ h: (hsl.h + 90) % 360, s: hsl.s, l: hsl.l, a: hsl.a }),
          new Color({ h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l, a: hsl.a }),
          new Color({ h: (hsl.h + 270) % 360, s: hsl.s, l: hsl.l, a: hsl.a })
        );
        break;

      case 'split-complementary':
        colors.push(
          new Color({ h: (hsl.h + 150) % 360, s: hsl.s, l: hsl.l, a: hsl.a }),
          new Color({ h: (hsl.h + 210) % 360, s: hsl.s, l: hsl.l, a: hsl.a })
        );
        break;

      case 'square':
        colors.push(
          new Color({ h: (hsl.h + 90) % 360, s: hsl.s, l: hsl.l, a: hsl.a }),
          new Color({ h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l, a: hsl.a }),
          new Color({ h: (hsl.h + 270) % 360, s: hsl.s, l: hsl.l, a: hsl.a })
        );
        break;

      case 'monochromatic':
        const step = 100 / (count + 1);
        for (let i = 1; i <= count; i++) {
          colors.push(
            new Color({
              h: hsl.h,
              s: hsl.s,
              l: Math.max(0, Math.min(100, step * i)),
              a: hsl.a,
            })
          );
        }
        break;
    }

    return colors;
  }

  /**
   * Get supported color formats
   * @returns Array of supported format names
   */
  static getSupportedFormats(): string[] {
    return getSupportedFormats();
  }

  /**
   * Check if format is valid
   * @param format - Format to check
   * @returns True if format is supported
   */
  static isValidFormat(format: string): boolean {
    return isValidFormat(format);
  }

  /**
   * Get conversion path between formats
   * @param from - Source format
   * @param to - Target format
   * @returns Array of formats in conversion path
   */
  static getConversionPath(from: string, to: string): string[] | null {
    return getConversionPath(from, to);
  }

  /**
   * Checks if the color is valid
   * @returns True if color is valid
   */
  isValid(): boolean {
    return isValidColor(this.toHex());
  }

  /**
   * Creates a Color instance from string
   * @param color - Color string
   * @returns Color instance or null if invalid
   */
  static fromString(color: string): Color | null {
    if (!isValidColor(color)) {
      return null;
    }
    return new Color(color);
  }

  /**
   * Creates a random Color
   * @returns Random Color instance
   */
  static random(): Color {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return new Color([r, g, b, 1]);
  }

  /**
   * Predefined colors
   */
  static get transparent(): Color {
    return new Color('transparent');
  }

  static get white(): Color {
    return new Color('#ffffff');
  }

  static get black(): Color {
    return new Color('#000000');
  }

  static get red(): Color {
    return new Color('#ff0000');
  }

  static get green(): Color {
    return new Color('#00ff00');
  }

  static get blue(): Color {
    return new Color('#0000ff');
  }

  static get yellow(): Color {
    return new Color('#ffff00');
  }

  static get cyan(): Color {
    return new Color('#00ffff');
  }

  static get magenta(): Color {
    return new Color('#ff00ff');
  }

  static get gray(): Color {
    return new Color('#808080');
  }

  static get lightGray(): Color {
    return new Color('#d3d3d3');
  }

  static get darkGray(): Color {
    return new Color('#a9a9a9');
  }

  static get orange(): Color {
    return new Color('#ffa500');
  }

  static get purple(): Color {
    return new Color('#800080');
  }

  static get pink(): Color {
    return new Color('#ffc0cb');
  }

  static get brown(): Color {
    return new Color('#a52a2a');
  }

  static get teal(): Color {
    return new Color('#008080');
  }

  static get lime(): Color {
    return new Color('#00ff00');
  }

  static get indigo(): Color {
    return new Color('#4b0082');
  }

  static get violet(): Color {
    return new Color('#ee82ee');
  }
}
