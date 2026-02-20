/**
 * Color format types supported by the utility
 */
export type ColorFormat =
  | 'hex'
  | 'rgb'
  | 'rgba'
  | 'hsl'
  | 'hsla'
  | 'oklch'
  | 'oklab'
  | 'hsv'
  | 'hsva'
  | 'cmyk'
  | 'lab'
  | 'lch'
  | 'xyz'
  | 'hwb';

/**
 * Color space types for color mixing operations
 */
export type ColorSpace =
  | 'srgb'
  | 'oklab'
  | 'oklch'
  | 'hsl'
  | 'hsv'
  | 'lab'
  | 'lch'
  | 'xyz'
  | 'hwb';

/**
 * Color adjustment options for various operations
 */
export interface ColorAdjustmentOptions {
  /** Lightness adjustment (-100 to 100) */
  lightness?: number;
  /** Saturation adjustment (-100 to 100) */
  saturation?: number;
  /** Hue adjustment (-360 to 360) */
  hue?: number;
  /** Alpha adjustment (0 to 1) */
  alpha?: number;
  /** Contrast adjustment (0 to 100) */
  contrast?: number;
}

/**
 * Color mixing parameters
 */
export interface ColorMixOptions {
  /** Base color */
  color: string;
  /** Color to mix with */
  with?: string;
  /** Mix percentage (0-100) */
  percentage?: number;
  /** Color space for mixing */
  colorSpace?: ColorSpace;
  /** Opacity of the base color */
  opacity?: number | string;
  /** Opacity of the mix color */
  withOpacity?: number | string;
}

/**
 * Palette generation options
 */
export interface PaletteOptions {
  /** Number of shades to generate */
  shades?: number;
  /** Lightness variation factor */
  lightnessFactor?: number;
  /** Saturation variation factor */
  saturationFactor?: number;
  /** Include complementary colors */
  includeComplementary?: boolean;
  /** Include analogous colors */
  includeAnalogous?: boolean;
  /** Include triadic colors */
  includeTriadic?: boolean;
  /** Include tetradic colors */
  includeTetradic?: boolean;
}

/**
 * Color contrast options
 */
export interface ContrastOptions {
  /** Light color for contrast */
  lightColor?: string;
  /** Dark color for contrast */
  darkColor?: string;
  /** Target contrast ratio */
  targetRatio?: number;
  /** Fallback color */
  fallbackColor?: string;
}

/**
 * Utility functions for type assertions
 */
export type HexDigit =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F';

export type HexString<T extends string> =
  T extends `#${HexDigit}${HexDigit}${HexDigit}${infer Rest1}`
    ? Rest1 extends ``
      ? T // three-digit hex color
      : Rest1 extends `${HexDigit}${HexDigit}${HexDigit}`
      ? T // six-digit hex color
      : never
    : never;
// T extends `#${HexDigit}${HexDigit}${HexDigit}${infer Rest1}`
//   ? Rest1 extends ''
//     ? T // three-digit hex color
//     : Rest1 extends `${HexDigit}${HexDigit}${HexDigit}`
//     ? T // six-digit hex color
//     : Rest1 extends `${HexDigit}${HexDigit}${HexDigit}${HexDigit}`
//     ? T // eight-digit hex color (with alpha)
//     : never
//   : never;

/**
 * Color component values
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}

export interface HSVColor {
  h: number;
  s: number;
  v: number;
  a?: number;
}

export interface HWBColor {
  h: number;
  w: number;
  b: number;
  a?: number;
}

export interface CMYKColor {
  c: number;
  m: number;
  y: number;
  k: number;
  a?: number;
}

export interface LABColor {
  l: number;
  a: number;
  b: number;
  alpha?: number;
}

export interface LCHColor {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export interface OKLABColor {
  l: number;
  a: number;
  b: number;
  alpha?: number;
}

export interface OKLCHColor {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export interface XYZColor {
  x: number;
  y: number;
  z: number;
  alpha?: number;
}

/**
 * Union type for all color representations
 */
export type AnyColor =
  | RGBColor
  | HSLColor
  | HSVColor
  | HWBColor
  | CMYKColor
  | LABColor
  | LCHColor
  | OKLABColor
  | OKLCHColor
  | XYZColor;

/**
 * Color conversion options
 */
export interface ColorConversionOptions {
  /** Output format */
  format?: ColorFormat;
  /** Preserve alpha channel */
  preserveAlpha?: boolean;
  /** Round decimal values */
  round?: boolean;
  /** Decimal precision */
  precision?: number;
}

/**
 * Color temperature options
 */
export interface ColorTemperatureOptions {
  /** Temperature adjustment in Kelvin */
  temperature?: number;
  /** Intensity of temperature effect (0-1) */
  intensity?: number;
}

/**
 * Color harmony options
 */
export interface ColorHarmonyOptions {
  /** Type of harmony to generate */
  type?:
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'tetradic'
    | 'split-complementary'
    | 'square'
    | 'monochromatic';
  /** Number of colors to generate */
  count?: number;
  /** Angle offset for analogous colors */
  angleOffset?: number;
}
