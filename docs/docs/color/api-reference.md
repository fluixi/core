---
sidebar_position: 9
title: API Reference
description: Complete API reference for all color functions and classes
---

# API Reference

Complete reference for all functions, classes, and types in the color management system.

## Color Class

The main class for working with colors.

### Constructor

```typescript
new Color(color: ColorRepresentation)
```

Creates a new Color instance from various representations.

**Parameters:**
- `color`: String (hex, rgb, hsl, etc.), array `[r, g, b, a]`, object `{ r, g, b, a }`, or another Color instance

**Examples:**
```typescript
new Color('#3498db')
new Color('rgb(52, 152, 219)')
new Color([52, 152, 219, 1])
new Color({ r: 52, g: 152, b: 219, a: 1 })
new Color({ h: 204, s: 70, l: 53 })
```

### Properties

#### `r`, `g`, `b`, `a`

```typescript
color.r: number  // 0-255
color.g: number  // 0-255
color.b: number  // 0-255
color.a: number  // 0-1
```

Get or set RGB/alpha components.

#### `rgb`, `rgba`

```typescript
color.rgb: [number, number, number]
color.rgba: [number, number, number, number]
```

Get RGB/RGBA as arrays.

### Conversion Methods

#### `toHex()`

```typescript
color.toHex(): string
```

Convert to hex string.

**Returns:** Hex color string (e.g., `'#3498db'`)

#### `toRgb()` / `toRgba()`

```typescript
color.toRgb(): string
color.toRgba(): string
```

Convert to RGB/RGBA string.

**Returns:** RGB string (e.g., `'rgb(52 152 219)'`)

#### `toHsl()`

```typescript
color.toHsl(): string
```

Convert to HSL/HSLA string.

**Returns:** HSL string (e.g., `'hsl(204, 70%, 53%)'`)

#### `toHsv()`

```typescript
color.toHsv(): string
```

Convert to HSV string.

**Returns:** HSV string (e.g., `'hsv(204, 76%, 86%)'`)

#### `toHwb()`

```typescript
color.toHwb(): string
```

Convert to HWB string.

**Returns:** HWB string (e.g., `'hwb(204 20% 14%)'`)

#### `toCmyk()`

```typescript
color.toCmyk(): string
```

Convert to CMYK string.

**Returns:** CMYK string (e.g., `'cmyk(76%, 31%, 0%, 14%)'`)

#### `toLab()`

```typescript
color.toLab(): string
```

Convert to LAB string.

**Returns:** LAB string (e.g., `'lab(54.18% -7.41 -35.21)'`)

#### `toLch()`

```typescript
color.toLch(): string
```

Convert to LCH string.

**Returns:** LCH string (e.g., `'lch(54.18% 35.97 258.13)'`)

#### `toOklab()`

```typescript
color.toOklab(): string
```

Convert to OKLAB string.

**Returns:** OKLAB string (e.g., `'oklab(0.6319 -0.0365 -0.1164)'`)

#### `toOklch()`

```typescript
color.toOklch(): string
```

Convert to OKLCH string.

**Returns:** OKLCH string (e.g., `'oklch(0.6319 0.1237 237.08)'`)

#### `toXyz()`

```typescript
color.toXyz(): string
```

Convert to XYZ string.

**Returns:** XYZ string (e.g., `'color(xyz 21.98 23.53 58.61)'`)

#### `toString(format)`

```typescript
color.toString(format?: ColorFormat): string
```

Convert to string in specified format.

**Parameters:**
- `format`: Target format ('hex', 'rgb', 'hsl', 'oklch', etc.)

**Returns:** Color string in specified format

### Object Getters

Get color components as objects:

```typescript
color.getRgbObject(): RGBColor
color.getHslObject(): HSLColor
color.getHsvObject(): HSVColor
color.getHwbObject(): HWBColor
color.getCmykObject(): CMYKColor
color.getLabObject(): LABColor
color.getLchObject(): LCHColor
color.getOklabObject(): OKLABColor
color.getOklchObject(): OKLCHColor
color.getXyzObject(): XYZColor
```

### Manipulation Methods

#### `lighten(amount)`

```typescript
color.lighten(amount: number): this
```

Lighten the color.

**Parameters:**
- `amount`: Lightness increase (0-100)

**Returns:** This Color instance (chainable)

#### `darken(amount)`

```typescript
color.darken(amount: number): this
```

Darken the color.

**Parameters:**
- `amount`: Lightness decrease (0-100)

**Returns:** This Color instance (chainable)

#### `saturate(amount)`

```typescript
color.saturate(amount: number): this
```

Increase saturation.

**Parameters:**
- `amount`: Saturation increase (0-100)

**Returns:** This Color instance (chainable)

#### `desaturate(amount)`

```typescript
color.desaturate(amount: number): this
```

Decrease saturation.

**Parameters:**
- `amount`: Saturation decrease (0-100)

**Returns:** This Color instance (chainable)

#### `rotate(degrees)`

```typescript
color.rotate(degrees: number): this
```

Rotate hue.

**Parameters:**
- `degrees`: Hue rotation (-360 to 360)

**Returns:** This Color instance (chainable)

#### `alpha(alpha)`

```typescript
color.alpha(alpha: number): this
```

Set alpha/opacity.

**Parameters:**
- `alpha`: Alpha value (0-1)

**Returns:** This Color instance (chainable)

#### `adjust(options)`

```typescript
color.adjust(options: ColorAdjustmentOptions): this
```

Adjust multiple properties at once.

**Parameters:**
- `options.lightness`: Lightness adjustment (-100 to 100)
- `options.saturation`: Saturation adjustment (-100 to 100)
- `options.hue`: Hue adjustment (-360 to 360)
- `options.alpha`: Alpha value (0 to 1)
- `options.contrast`: Contrast adjustment (0 to 100)

**Returns:** This Color instance (chainable)

#### `mix(color, percentage, colorSpace)`

```typescript
color.mix(color: string, percentage?: number, colorSpace?: ColorSpace): this
```

Mix with another color.

**Parameters:**
- `color`: Color to mix with
- `percentage`: Mix percentage (0-100), default: 50
- `colorSpace`: Color space for mixing, default: 'srgb'

**Returns:** This Color instance (chainable)

### Utility Methods

#### `clone()`

```typescript
color.clone(): Color
```

Create a copy of the color.

**Returns:** New Color instance

#### `isValid()`

```typescript
color.isValid(): boolean
```

Check if the color is valid.

**Returns:** True if valid

#### `getLuminance()`

```typescript
color.getLuminance(): number
```

Get relative luminance (0-1).

**Returns:** Luminance value

#### `getContrastRatio(color)`

```typescript
color.getContrastRatio(color: string | Color): number
```

Calculate contrast ratio with another color.

**Parameters:**
- `color`: Color to compare with

**Returns:** Contrast ratio (1-21)

#### `getContrastColor(options)`

```typescript
color.getContrastColor(options?: ContrastOptions): Color
```

Get contrasting color (black or white).

**Parameters:**
- `options.lightColor`: Light color to use, default: '#ffffff'
- `options.darkColor`: Dark color to use, default: '#000000'
- `options.targetRatio`: Target contrast ratio
- `options.fallbackColor`: Fallback if target not achievable

**Returns:** Contrasting Color instance

#### `getHarmony(options)`

```typescript
color.getHarmony(options?: ColorHarmonyOptions): Color[]
```

Generate color harmonies.

**Parameters:**
- `options.type`: Harmony type ('complementary', 'analogous', 'triadic', 'tetradic', 'split-complementary', 'square', 'monochromatic')
- `options.count`: Number of colors for monochromatic
- `options.angleOffset`: Angle offset for analogous

**Returns:** Array of Color instances

#### `getPalette(options)`

```typescript
color.getPalette(options?: PaletteOptions): Record<string, string>
```

Generate color palette.

**Parameters:**
- `options.shades`: Number of shades (default: 9)
- `options.lightnessFactor`: Lightness variation
- `options.saturationFactor`: Saturation variation
- `options.includeComplementary`: Include complementary color
- `options.includeAnalogous`: Include analogous colors
- `options.includeTriadic`: Include triadic colors

**Returns:** Object with shade keys and hex values

#### `convertTo(format, options)`

```typescript
color.convertTo(format: ColorFormat, options?: ColorConversionOptions): any
```

Convert to any format with options.

**Parameters:**
- `format`: Target format
- `options.round`: Round values, default: true
- `options.precision`: Decimal precision, default: 2
- `options.preserveAlpha`: Keep alpha channel, default: true

**Returns:** Color object in target format

#### `setFromObject(color)`

```typescript
color.setFromObject(color: AnyColor): this
```

Set color from any color space object.

**Parameters:**
- `color`: Color object (RGB, HSL, OKLCH, etc.)

**Returns:** This Color instance (chainable)

### Static Methods

#### `Color.fromString(color)`

```typescript
Color.fromString(color: string): Color | null
```

Create Color from string, returns null if invalid.

#### `Color.random()`

```typescript
Color.random(): Color
```

Create random color.

#### `Color.getSupportedFormats()`

```typescript
Color.getSupportedFormats(): string[]
```

Get array of supported formats.

#### `Color.isValidFormat(format)`

```typescript
Color.isValidFormat(format: string): boolean
```

Check if format is supported.

#### `Color.getConversionPath(from, to)`

```typescript
Color.getConversionPath(from: string, to: string): string[] | null
```

Get conversion path between formats.

### Static Color Instances

Pre-defined color instances:

```typescript
Color.white       // #ffffff
Color.black       // #000000
Color.red         // #ff0000
Color.green       // #00ff00
Color.blue        // #0000ff
Color.yellow      // #ffff00
Color.cyan        // #00ffff
Color.magenta     // #ff00ff
Color.gray        // #808080
Color.lightGray   // #d3d3d3
Color.darkGray    // #a9a9a9
Color.orange      // #ffa500
Color.purple      // #800080
Color.pink        // #ffc0cb
Color.brown       // #a52a2a
Color.teal        // #008080
Color.lime        // #00ff00
Color.indigo      // #4b0082
Color.violet      // #ee82ee
Color.transparent // transparent
```

## Conversion Functions

### `convertColor(color, format, options)`

```typescript
convertColor(
  color: any,
  targetFormat: string,
  options?: ColorConversionOptions
): any
```

Universal color conversion function.

**Parameters:**
- `color`: Source color object
- `targetFormat`: Target format name
- `options`: Conversion options

**Returns:** Converted color object

### Specific Conversions

All color space pairs have conversion functions:

```typescript
// RGB conversions
rgbToHsl(rgb: RGBColor): HSLColor
rgbToHsv(rgb: RGBColor): HSVColor
rgbToHwb(rgb: RGBColor): HWBColor
rgbToCmyk(rgb: RGBColor): CMYKColor
rgbToXyz(rgb: RGBColor): XYZColor
rgbToLab(rgb: RGBColor): LABColor
rgbToLch(rgb: RGBColor): LCHColor
rgbToOklab(rgb: RGBColor): OKLABColor
rgbToOklch(rgb: RGBColor): OKLCHColor

// HSL conversions
hslToRgb(hsl: HSLColor): RGBColor
hslToHsv(hsl: HSLColor): HSVColor
hslToHwb(hsl: HSLColor): HWBColor

// And many more...
```

### `batchConvert(colors, format, options)`

```typescript
batchConvert(
  colors: any[],
  targetFormat: string,
  options?: ColorConversionOptions
): any[]
```

Convert multiple colors at once.

## Helper Functions

### `parseColor(color)`

```typescript
parseColor(color: string): [number, number, number, number] | null
```

Parse color string to RGBA array.

**Returns:** `[r, g, b, a]` or `null` if invalid

### `isValidColor(color)`

```typescript
isValidColor(color: string): boolean
```

Check if color string is valid.

### `generateGradient(start, end, steps, colorSpace)`

```typescript
generateGradient(
  startColor: string | Color,
  endColor: string | Color,
  steps?: number,
  colorSpace?: 'rgb' | 'hsl' | 'lab' | 'oklab' | 'oklch'
): Color[]
```

Generate gradient colors.

**Parameters:**
- `startColor`: Start color
- `endColor`: End color
- `steps`: Number of colors (default: 5)
- `colorSpace`: Interpolation space (default: 'rgb')

**Returns:** Array of Color instances

### `adjustTemperature(color, options)`

```typescript
adjustTemperature(
  color: string | Color,
  options?: ColorTemperatureOptions
): Color
```

Adjust color temperature.

**Parameters:**
- `color`: Input color
- `options.temperature`: Temperature shift (-10000 to 10000)
- `options.intensity`: Effect intensity (0-1)

**Returns:** Adjusted Color instance

### `simulateColorBlindness(color, type)`

```typescript
simulateColorBlindness(
  color: string | Color,
  type?: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
): Color
```

Simulate color blindness.

**Parameters:**
- `color`: Input color
- `type`: Type of color blindness

**Returns:** Simulated Color instance

### `invertColor(color, bw)`

```typescript
invertColor(color: string | Color, bw?: boolean): Color
```

Invert color.

**Parameters:**
- `color`: Input color
- `bw`: Use only black/white (default: false)

**Returns:** Inverted Color instance

### `toGrayscale(color, method)`

```typescript
toGrayscale(
  color: string | Color,
  method?: 'average' | 'luminosity' | 'lightness'
): Color
```

Convert to grayscale.

**Parameters:**
- `color`: Input color
- `method`: Conversion method (default: 'luminosity')

**Returns:** Grayscale Color instance

### `toSepia(color, intensity)`

```typescript
toSepia(color: string | Color, intensity?: number): Color
```

Apply sepia tone effect.

**Parameters:**
- `color`: Input color
- `intensity`: Effect intensity (0-1, default: 1)

**Returns:** Sepia-toned Color instance

### `colorDistance(color1, color2)`

```typescript
colorDistance(color1: string | Color, color2: string | Color): number
```

Calculate perceptual color distance (Delta E).

**Returns:** Distance value (0 = identical)

### `findClosestColor(color, palette)`

```typescript
findClosestColor(
  color: string | Color,
  palette: (string | Color)[]
): Color
```

Find closest color in palette.

**Parameters:**
- `color`: Target color
- `palette`: Array of colors to search

**Returns:** Closest Color instance

### `blendColors(base, blend, mode, opacity)`

```typescript
blendColors(
  base: string | Color,
  blend: string | Color,
  mode?: 'multiply' | 'screen' | 'overlay' | 'normal',
  opacity?: number
): Color
```

Blend colors using blend modes.

**Parameters:**
- `base`: Base color
- `blend`: Blend color
- `mode`: Blend mode (default: 'normal')
- `opacity`: Blend opacity (0-1, default: 1)

**Returns:** Blended Color instance

### `getColorName(color)`

```typescript
getColorName(color: string | Color): string
```

Get descriptive color name.

**Returns:** Color name string

### `isLight(color)` / `isDark(color)`

```typescript
isLight(color: string | Color): boolean
isDark(color: string | Color): boolean
```

Check if color is light or dark.

### `getPerceivedBrightness(color)`

```typescript
getPerceivedBrightness(color: string | Color): number
```

Get perceived brightness (0-1).

### `getDominantComponent(color)`

```typescript
getDominantComponent(color: string | Color): 'red' | 'green' | 'blue' | 'gray'
```

Get dominant color component.

### `randomColor(options)`

```typescript
randomColor(options?: {
  hue?: [number, number];
  saturation?: [number, number];
  lightness?: [number, number];
  alpha?: number;
}): Color
```

Generate random color with constraints.

## Type Definitions

### Color Spaces

```typescript
type ColorFormat = 
  | 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla'
  | 'hsv' | 'hsva' | 'hwb' | 'cmyk'
  | 'lab' | 'lch' | 'oklab' | 'oklch' | 'xyz';

type ColorSpace = 
  | 'srgb' | 'hsl' | 'hsv' | 'hwb'
  | 'lab' | 'lch' | 'oklab' | 'oklch' | 'xyz';
```

### Color Objects

```typescript
interface RGBColor {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  a?: number; // 0-1
}

interface HSLColor {
  h: number;  // 0-360
  s: number;  // 0-100
  l: number;  // 0-100
  a?: number; // 0-1
}

interface HSVColor {
  h: number;  // 0-360
  s: number;  // 0-100
  v: number;  // 0-100
  a?: number; // 0-1
}

interface HWBColor {
  h: number;  // 0-360
  w: number;  // 0-100
  b: number;  // 0-100
  a?: number; // 0-1
}

interface CMYKColor {
  c: number;  // 0-100
  m: number;  // 0-100
  y: number;  // 0-100
  k: number;  // 0-100
  a?: number; // 0-1
}

interface LABColor {
  l: number;      // 0-100
  a: number;      // -128 to 128
  b: number;      // -128 to 128
  alpha?: number; // 0-1
}

interface LCHColor {
  l: number;      // 0-100
  c: number;      // 0-230
  h: number;      // 0-360
  alpha?: number; // 0-1
}

interface OKLABColor {
  l: number;      // 0-1
  a: number;      // -0.4 to 0.4
  b: number;      // -0.4 to 0.4
  alpha?: number; // 0-1
}

interface OKLCHColor {
  l: number;      // 0-1
  c: number;      // 0-0.4
  h: number;      // 0-360
  alpha?: number; // 0-1
}

interface XYZColor {
  x: number;      // 0-100
  y: number;      // 0-100
  z: number;      // 0-100
  alpha?: number; // 0-1
}
```

### Options

```typescript
interface ColorAdjustmentOptions {
  lightness?: number;   // -100 to 100
  saturation?: number;  // -100 to 100
  hue?: number;         // -360 to 360
  alpha?: number;       // 0 to 1
  contrast?: number;    // 0 to 100
}

interface ColorConversionOptions {
  format?: ColorFormat;
  preserveAlpha?: boolean;
  round?: boolean;
  precision?: number;
}

interface ColorHarmonyOptions {
  type?: 'complementary' | 'analogous' | 'triadic' 
       | 'tetradic' | 'split-complementary' 
       | 'square' | 'monochromatic';
  count?: number;
  angleOffset?: number;
}

interface PaletteOptions {
  shades?: number;
  lightnessFactor?: number;
  saturationFactor?: number;
  includeComplementary?: boolean;
  includeAnalogous?: boolean;
  includeTriadic?: boolean;
  includeTetradic?: boolean;
}

interface ContrastOptions {
  lightColor?: string;
  darkColor?: string;
  targetRatio?: number;
  fallbackColor?: string;
}
```

## Constants

### Named Colors

147 named colors from CSS specification:

```typescript
import { NAMED_COLORS } from '@fluixi/utils/color';

NAMED_COLORS.red        // '#ff0000'
NAMED_COLORS.blue       // '#0000ff'
NAMED_COLORS.transparent // 'transparent'
// ... and 144 more
```

## Best Practices

### Always Clone Before Mutating

```typescript
// ✅ Good
const original = new Color('#3498db');
const modified = original.clone().lighten(20);

// ❌ Bad
const original = new Color('#3498db');
original.lighten(20); // Mutates original!
```

### Use OKLCH for Gradients

```typescript
// ✅ Best results
generateGradient('#ff0000', '#0000ff', 10, 'oklch');

// ❌ Muddy colors
generateGradient('#ff0000', '#0000ff', 10, 'rgb');
```

### Check Validity

```typescript
// ✅ Safe
const color = Color.fromString(userInput);
if (color) {
  // Use color
}

// ❌ Unsafe
const color = new Color(userInput); // May fail
```

## Performance Notes

- Most operations are O(1)
- Gradient generation is O(n) where n is steps
- Batch conversions are more efficient than individual ones
- Color class instances are lightweight

## Browser Support

All modern browsers and Node.js 14+:
- Chrome/Edge 88+
- Firefox 96+
- Safari 15+
- Node.js 14+

---

For more examples and guides, see:
- [Getting Started](./getting-started)
- [Examples](./examples)
- [Color Formats](./formats)