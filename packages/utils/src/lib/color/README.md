# Color Management System

A comprehensive, powerful color management library for TypeScript/JavaScript with support for multiple color spaces, conversions, and advanced color operations.

## Features

- 🎨 **Multiple Color Formats**: RGB, HSL, HSV, HWB, CMYK, LAB, LCH, OKLAB, OKLCH, XYZ
- 🔄 **Complete Conversions**: Convert between any supported color format
- 🎭 **Color Manipulation**: Lighten, darken, saturate, desaturate, rotate hue, and more
- 🎯 **Color Harmonies**: Generate complementary, analogous, triadic, and other color schemes
- ♿ **Accessibility**: Contrast ratio calculation and color blindness simulation
- 🎪 **Advanced Operations**: Gradients, mixing, blending, temperature adjustment
- 📦 **Object-Oriented**: Chainable Color class with immutable operations
- 🔍 **Type-Safe**: Full TypeScript support with comprehensive types

## Installation

```typescript
import { Color } from '@your-org/utils/color';
```

## Quick Start

### Basic Usage

```typescript
import { Color } from '@your-org/utils/color';

// Create a color
const color = new Color('#ff5733');

// Convert to different formats
color.toHex();      // '#ff5733'
color.toRgb();      // 'rgb(255, 87, 51)'
color.toHsl();      // 'hsl(9, 100%, 60%)'
color.toOklch();    // 'oklch(0.6878 0.1942 28.46)'

// Manipulate colors (chainable)
const lighter = color.clone().lighten(20);
const darker = color.clone().darken(10);
const rotated = color.clone().rotate(180);

// Get color information
color.getLuminance();        // 0.297
color.getContrastRatio('#fff'); // 3.52
```

## Supported Color Formats

### RGB/RGBA
```typescript
const color1 = new Color('rgb(255, 0, 0)');
const color2 = new Color('rgb(100% 0% 0%)');
const color3 = new Color('rgb(255 0 0 / 0.5)');
const color4 = new Color([255, 0, 0, 1]);
```

### HSL/HSLA
```typescript
const color = new Color('hsl(120, 100%, 50%)');
const hsl = color.getHslObject(); // { h: 120, s: 100, l: 50, a: 1 }
```

### HSV/HSVA
```typescript
const color = new Color({ h: 120, s: 100, v: 50 });
const hsv = color.getHsvObject();
```

### HWB (Hue, Whiteness, Blackness)
```typescript
const hwb = color.getHwbObject(); // { h: 120, w: 0, b: 50, a: 1 }
const hwbString = color.toHwb(); // 'hwb(120 0% 50%)'
```

### CMYK
```typescript
const cmyk = color.getCmykObject(); // { c: 100, m: 0, y: 100, k: 0, a: 1 }
const cmykString = color.toCmyk(); // 'cmyk(100%, 0%, 100%, 0%)'
```

### LAB (CIE L*a*b*)
```typescript
const lab = color.getLabObject(); // { l: 87.73, a: -86.18, b: 83.18 }
const labString = color.toLab(); // 'lab(87.73% -86.18 83.18)'
```

### LCH (Lightness, Chroma, Hue)
```typescript
const lch = color.getLchObject(); // { l: 87.73, c: 119.78, h: 136.02 }
const lchString = color.toLch(); // 'lch(87.73% 119.78 136.02)'
```

### OKLAB
```typescript
const oklab = color.getOklabObject(); // { l: 0.8664, a: -0.2339, b: 0.1752 }
const oklabString = color.toOklab(); // 'oklab(0.8664 -0.2339 0.1752)'
```

### OKLCH
```typescript
const oklch = color.getOklchObject(); // { l: 0.8664, c: 0.2950, h: 143.15 }
const oklchString = color.toOklch(); // 'oklch(0.8664 0.2950 143.15)'
```

### XYZ (CIE XYZ)
```typescript
const xyz = color.getXyzObject(); // { x: 35.76, y: 71.52, z: 11.92 }
const xyzString = color.toXyz(); // 'color(xyz 35.76 71.52 11.92)'
```

## Color Conversions

### Universal Conversion

```typescript
import { convertColor } from '@your-org/utils/color';

// Convert any format to any other format
const rgb = { r: 255, g: 87, b: 51, a: 1 };
const hsl = convertColor(rgb, 'hsl');
const oklch = convertColor(rgb, 'oklch');

// With options
const result = convertColor(rgb, 'hsl', {
  round: true,
  precision: 2,
  preserveAlpha: true
});
```

### Specific Conversions

```typescript
import {
  rgbToHsl,
  hslToRgb,
  rgbToOklch,
  oklchToRgb,
  rgbToLab,
  labToRgb
} from '@your-org/utils/color';

const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
const rgb = hslToRgb({ h: 0, s: 100, l: 50 });
```

### Batch Conversion

```typescript
import { batchConvert } from '@your-org/utils/color';

const colors = [
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 }
];

const oklchColors = batchConvert(colors, 'oklch');
```

### Conversion Paths

```typescript
import { getConversionPath, hasDirectConversion } from '@your-org/utils/color';

// Check conversion path
const path = getConversionPath('rgb', 'oklch');
// Returns: ['rgb', 'oklch']

// Check if direct conversion exists
const isDirect = hasDirectConversion('rgb', 'hsl'); // true
```

## Color Manipulation

### Adjustments

```typescript
const color = new Color('#3498db');

// Lighten/Darken
color.lighten(20);  // Increase lightness by 20%
color.darken(10);   // Decrease lightness by 10%

// Saturate/Desaturate
color.saturate(30);    // Increase saturation
color.desaturate(15);  // Decrease saturation

// Hue rotation
color.rotate(180);  // Rotate hue by 180 degrees

// Alpha
color.alpha(0.5);  // Set alpha to 50%

// Complex adjustments
color.adjust({
  lightness: 10,
  saturation: -5,
  hue: 30,
  alpha: 0.8,
  contrast: 20
});
```

### Mixing Colors

```typescript
// Mix two colors
const color1 = new Color('#ff0000');
const color2 = '#0000ff';

color1.mix(color2, 50); // 50% mix

// Mix with options
import { mixColors } from '@your-org/utils/color';

const mixed = mixColors({
  color: '#ff0000',
  with: '#0000ff',
  percentage: 30,
  colorSpace: 'oklch' // Mix in perceptually uniform space
});
```

## Color Harmonies

```typescript
const baseColor = new Color('#3498db');

// Complementary
const complementary = baseColor.getHarmony({ type: 'complementary' });

// Analogous
const analogous = baseColor.getHarmony({ 
  type: 'analogous',
  angleOffset: 30
});

// Triadic
const triadic = baseColor.getHarmony({ type: 'triadic' });

// Tetradic
const tetradic = baseColor.getHarmony({ type: 'tetradic' });

// Split Complementary
const splitComp = baseColor.getHarmony({ type: 'split-complementary' });

// Square
const square = baseColor.getHarmony({ type: 'square' });

// Monochromatic
const mono = baseColor.getHarmony({ 
  type: 'monochromatic',
  count: 5
});
```

## Palettes

```typescript
const color = new Color('#3498db');

// Generate palette
const palette = color.getPalette({
  shades: 9,
  lightnessFactor: 10,
  saturationFactor: 5,
  includeComplementary: true,
  includeAnalogous: true,
  includeTriadic: true
});

// Returns object like:
// {
//   '50': '#e3f2fd',
//   '100': '#bbdefb',
//   ...
//   '900': '#0d47a1',
//   'complementary': '#db9834',
//   'analogous-1': '#3498db',
//   'analogous-2': '#349bdb'
// }
```

## Advanced Features

### Gradients

```typescript
import { generateGradient } from '@your-org/utils/color';

const gradient = generateGradient(
  '#ff0000',
  '#0000ff',
  10,           // 10 steps
  'oklch'       // Perceptually uniform interpolation
);
// Returns array of Color objects
```

### Color Temperature

```typescript
import { adjustTemperature } from '@your-org/utils/color';

// Make warmer
const warm = adjustTemperature('#3498db', {
  temperature: 3000,  // Positive = warmer
  intensity: 0.5
});

// Make cooler
const cool = adjustTemperature('#ff5733', {
  temperature: -3000, // Negative = cooler
  intensity: 0.7
});
```

### Color Blindness Simulation

```typescript
import { simulateColorBlindness } from '@your-org/utils/color';

const color = new Color('#3498db');

const protanopia = simulateColorBlindness(color, 'protanopia');     // Red-blind
const deuteranopia = simulateColorBlindness(color, 'deuteranopia'); // Green-blind
const tritanopia = simulateColorBlindness(color, 'tritanopia');     // Blue-blind
const achromatopsia = simulateColorBlindness(color, 'achromatopsia'); // Complete color blindness
```

### Inversion and Effects

```typescript
import { invertColor, toGrayscale, toSepia } from '@your-org/utils/color';

// Invert
const inverted = invertColor('#3498db');
const bw = invertColor('#3498db', true); // Black or white only

// Grayscale
const gray1 = toGrayscale('#3498db', 'average');
const gray2 = toGrayscale('#3498db', 'luminosity');
const gray3 = toGrayscale('#3498db', 'lightness');

// Sepia
const sepia = toSepia('#3498db', 0.8); // 80% intensity
```

### Color Distance

```typescript
import { colorDistance, findClosestColor } from '@your-org/utils/color';

// Calculate perceptual distance (Delta E)
const distance = colorDistance('#ff0000', '#ff0011'); // Small value = similar

// Find closest color from palette
const palette = ['#ff0000', '#00ff00', '#0000ff'];
const closest = findClosestColor('#ff3333', palette);
```

### Blending

```typescript
import { blendColors } from '@your-org/utils/color';

const base = new Color('#ff0000');
const blend = new Color('#0000ff');

const multiply = blendColors(base, blend, 'multiply');
const screen = blendColors(base, blend, 'screen');
const overlay = blendColors(base, blend, 'overlay', 0.5); // 50% opacity
```

## Accessibility

### Contrast Ratios

```typescript
const color = new Color('#3498db');

// Calculate contrast ratio
const ratio = color.getContrastRatio('#ffffff'); // 3.52

// Get accessible contrast color
const contrastColor = color.getContrastColor({
  lightColor: '#ffffff',
  darkColor: '#000000',
  targetRatio: 4.5, // WCAG AA
  fallbackColor: '#333333'
});

// Check WCAG compliance
import { calculateContrastRatio } from '@your-org/utils/color';

const ratio = calculateContrastRatio('#3498db', '#ffffff');
const isAA = ratio >= 4.5;      // WCAG AA for normal text
const isAAA = ratio >= 7;       // WCAG AAA for normal text
const isAALarge = ratio >= 3;   // WCAG AA for large text
```

### Luminance

```typescript
const color = new Color('#3498db');
const luminance = color.getLuminance(); // 0.297 (0-1 scale)

// Check if light or dark
import { isLight, isDark, getPerceivedBrightness } from '@your-org/utils/color';

const light = isLight('#3498db');  // true
const dark = isDark('#3498db');    // false
const brightness = getPerceivedBrightness('#3498db'); // 0.509
```

## Utility Functions

### Color Analysis

```typescript
import { 
  getDominantComponent, 
  getColorName 
} from '@your-org/utils/color';

const dominant = getDominantComponent('#ff5733'); // 'red'
const name = getColorName('#ff5733'); // 'vivid orange'
```

### Random Colors

```typescript
import { randomColor } from '@your-org/utils/color';

// Completely random
const random1 = randomColor();

// Constrained random
const random2 = randomColor({
  hue: [0, 60],           // Red to yellow
  saturation: [70, 100],  // Highly saturated
  lightness: [40, 60],    // Medium brightness
  alpha: 0.8
});
```

### Validation

```typescript
import { isValidColor } from '@your-org/utils/color';

isValidColor('#ff5733');           // true
isValidColor('rgb(255, 87, 51)');  // true
isValidColor('not-a-color');       // false

// Check format
Color.isValidFormat('oklch');      // true
Color.isValidFormat('invalid');    // false

// Get supported formats
const formats = Color.getSupportedFormats();
// ['rgb', 'hsl', 'hsv', 'hwb', 'cmyk', 'xyz', 'lab', 'lch', 'oklab', 'oklch']
```

### Named Colors

```typescript
import { NAMED_COLORS } from '@your-org/utils/color';

const red = new Color(NAMED_COLORS.red);
const blue = new Color('cornflowerblue'); // 147 named colors supported

// Predefined color instances
Color.red;
Color.blue;
Color.green;
Color.transparent;
Color.white;
Color.black;
// ... and more
```

## Static Methods

```typescript
// Parse RGB strings
Color.parseRgbString('rgb(255, 0, 0)'); // [255, 0, 0, 1]
Color.isRgbFormat('rgb(255, 0, 0)');    // true
Color.getRgbPatternMatch('rgb(255, 0, 0)'); // 'LEGACY_RGB'

// Normalize RGB syntax
Color.normalizeRgbString('rgba(255,0,0,0.5)', 'modern');
// 'rgb(255 0 0 / 0.5)'

// Create from string
const color = Color.fromString('#ff5733'); // Color instance or null

// Random color
const random = Color.random();
```

## Best Practices

### Perceptually Uniform Color Spaces

For best visual results in gradients and color mixing, use perceptually uniform color spaces:

```typescript
// Good: OKLCH for perceptually uniform results
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'oklch');

// Also good: LAB
const mixed = mixColors({
  color: '#ff0000',
  with: '#0000ff',
  colorSpace: 'lab'
});
```

### Immutability

Color methods that modify the color return `this` for chaining, but the original color is mutated. Use `clone()` for immutable operations:

```typescript
const original = new Color('#3498db');
const modified = original.clone().lighten(20).saturate(10);

console.log(original.toHex());  // '#3498db' (unchanged)
console.log(modified.toHex());  // Different color
```

### Performance

For batch operations, use the functional API instead of creating Color instances:

```typescript
// Good for batch processing
import { rgbToHsl, batchConvert } from '@your-org/utils/color';

const colors = [/* ... */];
const converted = batchConvert(colors, 'hsl');

// Better for single operations with chaining
const color = new Color('#3498db').lighten(20).saturate(10);
```

## TypeScript Support

Full TypeScript support with comprehensive types:

```typescript
import type {
  ColorFormat,
  ColorSpace,
  RGBColor,
  HSLColor,
  HSVColor,
  ColorConversionOptions,
  ColorHarmonyOptions,
  ColorAdjustmentOptions
} from '@your-org/utils/color';

const rgb: RGBColor = { r: 255, g: 0, b: 0, a: 1 };
const options: ColorConversionOptions = {
  format: 'oklch',
  preserveAlpha: true,
  round: true,
  precision: 4
};
```

## Examples

### Creating a Theme

```typescript
const primary = new Color('#3498db');

const theme = {
  primary: primary.toHex(),
  primaryLight: primary.clone().lighten(10).toHex(),
  primaryDark: primary.clone().darken(10).toHex(),
  complementary: primary.getHarmony({ type: 'complementary' })[0].toHex(),
  palette: primary.getPalette({ shades: 9 }),
  accessible: primary.getContrastColor({ targetRatio: 4.5 }).toHex()
};
```

### Color Picker with Live Preview

```typescript
function createColorVariations(hex: string) {
  const color = new Color(hex);
  
  return {
    original: color.toHex(),
    lighter: color.clone().lighten(20).toHex(),
    darker: color.clone().darken(20).toHex(),
    saturated: color.clone().saturate(30).toHex(),
    desaturated: color.clone().desaturate(30).toHex(),
    complementary: color.getHarmony({ type: 'complementary' })[0].toHex(),
    triadic: color.getHarmony({ type: 'triadic' }).map(c => c.toHex()),
    isLight: isLight(color),
    contrastRatio: color.getContrastRatio('#ffffff')
  };
}
```

### Accessible Color Palette Generator

```typescript
function generateAccessiblePalette(baseColor: string) {
  const color = new Color(baseColor);
  const shades = [];
  
  for (let i = 50; i <= 900; i += 50) {
    const lightness = 95 - ((i / 50) * 10);
    const shade = color.clone().adjust({ lightness: lightness - 50 });
    
    // Ensure adequate contrast
    const onWhite = shade.getContrastRatio('#ffffff');
    const onBlack = shade.getContrastRatio('#000000');
    
    shades.push({
      value: i,
      color: shade.toHex(),
      onWhite: onWhite >= 4.5 ? 'pass' : 'fail',
      onBlack: onBlack >= 4.5 ? 'pass' : 'fail'
    });
  }
  
  return shades;
}
```

## License

MIT