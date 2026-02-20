---
sidebar_position: 2
title: Getting Started
description: Quick start guide for the color management system
---

# Getting Started

Get up and running with the color management system in under 5 minutes.

## Installation

The color utilities are part of the `@awc/utils` package:

```bash
npm install @awc/utils
```

Or with your preferred package manager:

```bash
# pnpm
pnpm add @awc/utils

# yarn
yarn add @awc/utils
```

## Basic Import

Import the color utilities you need:

```typescript
// Import the Color class
import { Color } from '@awc/utils/color';

// Import specific utilities
import { 
  parseColor, 
  convertColor, 
  generateGradient,
  isValidColor 
} from '@awc/utils/color';
```

## Creating Colors

There are multiple ways to create a color:

### From Hex

```typescript
const color = new Color('#3498db');
const color2 = new Color('#f00'); // Short form
const color3 = new Color('#ff000080'); // With alpha
```

### From RGB/RGBA

```typescript
// String format
const color1 = new Color('rgb(52, 152, 219)');
const color2 = new Color('rgb(52 152 219)'); // Modern syntax
const color3 = new Color('rgba(52, 152, 219, 0.8)');
const color4 = new Color('rgb(52 152 219 / 0.8)'); // Modern with alpha

// Array format
const color5 = new Color([52, 152, 219, 1]);

// Object format
const color6 = new Color({ r: 52, g: 152, b: 219, a: 1 });
```

### From Other Color Spaces

```typescript
// HSL
const color1 = new Color('hsl(204, 70%, 53%)');
const color2 = new Color({ h: 204, s: 70, l: 53 });

// Named colors
const red = new Color('red');
const blue = new Color('blue');

// Predefined colors
const white = Color.white;
const black = Color.black;
const transparent = Color.transparent;
```

## Converting Colors

Convert to any supported format:

```typescript
const color = new Color('#3498db');

// Standard formats
color.toHex();      // '#3498db'
color.toRgb();      // 'rgb(52 152 219)'
color.toRgba();     // 'rgba(52 152 219 / 1)'
color.toHsl();      // 'hsl(204, 70%, 53%)'
color.toHsv();      // 'hsv(204, 76%, 86%)'

// Advanced formats
color.toHwb();      // 'hwb(204 20% 14%)'
color.toCmyk();     // 'cmyk(76%, 31%, 0%, 14%)'
color.toLab();      // 'lab(54.18% -7.41 -35.21)'
color.toLch();      // 'lch(54.18% 35.97 258.13)'
color.toOklab();    // 'oklab(0.6319 -0.0365 -0.1164)'
color.toOklch();    // 'oklch(0.6319 0.1237 237.08)'
color.toXyz();      // 'color(xyz 21.98 23.53 58.61)'
```

## Basic Manipulation

Adjust colors with chainable methods:

```typescript
const color = new Color('#3498db');

// Lighten by 20%
const lighter = color.clone().lighten(20);

// Darken by 10%
const darker = color.clone().darken(10);

// Increase saturation by 30%
const saturated = color.clone().saturate(30);

// Rotate hue by 180 degrees
const complementary = color.clone().rotate(180);

// Set opacity to 50%
const transparent = color.clone().alpha(0.5);

// Chain multiple operations
const adjusted = color.clone()
  .lighten(10)
  .saturate(20)
  .rotate(30)
  .alpha(0.8);
```

:::tip
Always use `.clone()` before manipulating colors to avoid mutating the original!
:::

## Working with Color Properties

Access and modify color components:

```typescript
const color = new Color('#3498db');

// Get RGB components
console.log(color.r); // 52
console.log(color.g); // 152
console.log(color.b); // 219
console.log(color.a); // 1

// Get as arrays
const rgb = color.rgb;   // [52, 152, 219]
const rgba = color.rgba; // [52, 152, 219, 1]

// Get as objects
const rgbObj = color.getRgbObject();  // { r: 52, g: 152, b: 219, a: 1 }
const hslObj = color.getHslObject();  // { h: 204, s: 70, l: 53, a: 1 }
const oklchObj = color.getOklchObject(); // { l: 0.63, c: 0.12, h: 237, alpha: 1 }
```

## Validation

Check if colors are valid:

```typescript
import { isValidColor } from '@awc/utils/color';

isValidColor('#3498db');           // true
isValidColor('rgb(52, 152, 219)'); // true
isValidColor('hsl(204, 70%, 53%)'); // true
isValidColor('red');               // true
isValidColor('not-a-color');       // false

// Or use the Color class
const color = Color.fromString('#3498db');
if (color) {
  console.log('Valid color!');
} else {
  console.log('Invalid color');
}
```

## Common Use Cases

### Theme Colors

```typescript
const primary = new Color('#3498db');

const theme = {
  primary: primary.toHex(),
  primaryLight: primary.clone().lighten(20).toHex(),
  primaryDark: primary.clone().darken(20).toHex(),
  primaryFaded: primary.clone().alpha(0.1).toHex(),
};
```

### Accessible Text Colors

```typescript
const background = new Color('#3498db');
const textColor = background.getContrastColor();

console.log(textColor.toHex()); // '#ffffff' (white for better contrast)
```

### Color Palette

```typescript
const brand = new Color('#3498db');
const palette = brand.getPalette({ shades: 9 });

console.log(palette);
// {
//   '50': '#e3f2fd',
//   '100': '#bbdefb',
//   ...
//   '900': '#0d47a1'
// }
```

### Gradient Colors

```typescript
import { generateGradient } from '@awc/utils/color';

const gradient = generateGradient('#ff0000', '#0000ff', 5, 'oklch');
// Returns 5 colors smoothly transitioning from red to blue
```

## Next Steps

Now that you know the basics, explore:

- **[Color Formats](./formats)** - Learn about all supported color spaces
- **[Color Class API](./color-class)** - Detailed API reference
- **[Conversions](./conversions)** - Deep dive into color space conversions
- **[Examples](./examples)** - Real-world usage examples

## Quick Reference

### Creating Colors

```typescript
new Color('#3498db')                    // Hex
new Color('rgb(52, 152, 219)')         // RGB string
new Color([52, 152, 219, 1])           // RGB array
new Color({ r: 52, g: 152, b: 219 })  // RGB object
new Color('red')                        // Named color
Color.random()                          // Random color
```

### Converting

```typescript
color.toHex()    // Hex string
color.toRgb()    // RGB string
color.toHsl()    // HSL string
color.toOklch()  // OKLCH string
```

### Manipulating

```typescript
color.lighten(20)     // Lighter
color.darken(20)      // Darker
color.saturate(30)    // More saturated
color.desaturate(30)  // Less saturated
color.rotate(180)     // Hue rotation
color.alpha(0.5)      // Set opacity
```

### Utilities

```typescript
color.getContrastColor()        // Get contrast color
color.getContrastRatio('#fff')  // Calculate contrast
color.getHarmony({ type: 'complementary' }) // Color harmony
color.getPalette({ shades: 9 }) // Generate palette
color.clone()                   // Clone color
```

## TypeScript Support

Full TypeScript support with comprehensive types:

```typescript
import type {
  ColorFormat,
  ColorSpace,
  RGBColor,
  HSLColor,
  ColorConversionOptions,
} from '@awc/utils/color';

const rgb: RGBColor = { r: 255, g: 0, b: 0, a: 1 };
const format: ColorFormat = 'oklch';
const options: ColorConversionOptions = {
  round: true,
  precision: 4,
  preserveAlpha: true,
};
```

## Tips & Best Practices

### 1. Clone Before Modifying

```typescript
// ✅ Good - original is preserved
const original = new Color('#3498db');
const modified = original.clone().lighten(20);

// ❌ Bad - mutates original
const original = new Color('#3498db');
original.lighten(20); // original is now modified!
```

### 2. Use OKLCH for Gradients

```typescript
// ✅ Good - perceptually uniform
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'oklch');

// ❌ Not as good - muddy middle colors
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'rgb');
```

### 3. Check Accessibility Early

```typescript
// ✅ Good
const text = background.getContrastColor({ targetRatio: 4.5 });

// ❌ Manual checking is more work
if (background.getContrastRatio('#fff') < 4.5) {
  // figure out what color to use...
}
```

### 4. Validate User Input

```typescript
// ✅ Good
const userColor = getUserInput();
if (isValidColor(userColor)) {
  const color = new Color(userColor);
  // use color...
} else {
  // show error...
}
```

## Troubleshooting

### Color not parsing correctly

Make sure the format is valid:

```typescript
// ✅ Valid formats
'#3498db'
'rgb(52, 152, 219)'
'rgb(52 152 219)'
'hsl(204, 70%, 53%)'

// ❌ Invalid formats
'#gggggg'  // Invalid hex
'rgb(52 152)'  // Missing blue component
'hsl(204, 70%)'  // Missing lightness
```

### Unexpected color results

When working with percentages in RGB:

```typescript
// RGB percentages are 0-100%
'rgb(100%, 0%, 0%)'  // Red (255, 0, 0)
'rgb(50%, 50%, 50%)' // Gray (128, 128, 128)

// Not the same as RGB values 0-255
'rgb(100, 0, 0)'     // Dark red (100, 0, 0)
```

### TypeScript errors

Import types explicitly:

```typescript
import { Color } from '@awc/utils/color';
import type { RGBColor, ColorFormat } from '@awc/utils/color';
```

## Support

- **Documentation**: Browse all documentation sections
- **Examples**: Check out the [examples page](./examples)
- **API Reference**: See the [complete API reference](./api-reference)
- **GitHub**: Report issues or contribute

---

Ready to dive deeper? Continue to [Color Formats](./formats) to learn about all supported color spaces.