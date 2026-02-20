---
sidebar_position: 3
title: Color Formats
description: Complete guide to all supported color formats and spaces
---

# Color Formats

The color management system supports 10+ color formats, each optimized for different use cases. This guide explains each format and when to use it.

## Overview

| Format | Best For | Range | Notes |
|--------|----------|-------|-------|
| **RGB** | Web, displays | 0-255 | Standard sRGB color space |
| **HSL** | Intuitive adjustments | H: 0-360°, S/L: 0-100% | Easy lightness control |
| **HSV** | Color pickers | H: 0-360°, S/V: 0-100% | Similar to HSL |
| **HWB** | Intuitive mixing | H: 0-360°, W/B: 0-100% | Hue, whiteness, blackness |
| **CMYK** | Print design | 0-100% | Subtractive color |
| **LAB** | Perceptual accuracy | L: 0-100, a/b: ±128 | Device-independent |
| **LCH** | LAB in polar form | L: 0-100, C: 0-230, H: 0-360° | Easier than LAB |
| **OKLAB** | Modern perceptual | L: 0-1, a/b: ±0.4 | Better than LAB |
| **OKLCH** | Best for gradients | L: 0-1, C: 0-0.4, H: 0-360° | Recommended! |
| **XYZ** | Color science | 0-100 | CIE standard |

## RGB (Red, Green, Blue)

The standard color model for screens and web.

### Usage

```typescript
// String formats
new Color('rgb(255, 0, 0)');          // Legacy comma-separated
new Color('rgb(255 0 0)');            // Modern space-separated
new Color('rgba(255, 0, 0, 0.5)');    // With alpha
new Color('rgb(255 0 0 / 0.5)');      // Modern with alpha

// Percentages
new Color('rgb(100%, 0%, 0%)');       // Red
new Color('rgb(50%, 50%, 50%)');      // Gray

// Object format
new Color({ r: 255, g: 0, b: 0, a: 1 });

// Array format
new Color([255, 0, 0, 1]);

// Convert to RGB
color.toRgb();      // 'rgb(255 0 0)'
color.toRgba();     // 'rgba(255 0 0 / 1)'
color.getRgbObject(); // { r: 255, g: 0, b: 0, a: 1 }
```

### Characteristics

- **Range**: Each component 0-255 (or 0-100%)
- **Alpha**: 0-1 (or 0-100%)
- **Use Cases**: 
  - Web development
  - Direct pixel manipulation
  - Display colors
  - CSS styling

### Pros & Cons

✅ **Pros:**
- Universal support
- Direct display representation
- Easy to understand

❌ **Cons:**
- Not perceptually uniform
- Hard to predict color changes
- Poor for gradients

---

## HSL (Hue, Saturation, Lightness)

Intuitive color model based on human perception.

### Usage

```typescript
// String format
new Color('hsl(0, 100%, 50%)');       // Red
new Color('hsla(120, 100%, 50%, 0.5)'); // Green with alpha

// Object format
new Color({ h: 0, s: 100, l: 50, a: 1 });

// Convert to HSL
color.toHsl();       // 'hsl(0, 100%, 50%)'
color.getHslObject(); // { h: 0, s: 100, l: 50, a: 1 }
```

### Characteristics

- **Hue**: 0-360° (color wheel position)
  - 0° = Red
  - 120° = Green
  - 240° = Blue
- **Saturation**: 0-100% (color intensity)
  - 0% = Gray
  - 100% = Full color
- **Lightness**: 0-100% (brightness)
  - 0% = Black
  - 50% = Pure color
  - 100% = White

### Use Cases

- Easy color adjustments
- Creating color variations
- User-friendly color pickers
- Design systems

### Example

```typescript
const color = new Color('#3498db');
const hsl = color.getHslObject();

// Adjust lightness easily
const lighter = new Color({ ...hsl, l: hsl.l + 20 });
const darker = new Color({ ...hsl, l: hsl.l - 20 });

// Change hue while keeping saturation/lightness
const shifted = new Color({ ...hsl, h: (hsl.h + 180) % 360 });
```

---

## HSV (Hue, Saturation, Value)

Similar to HSL but with different brightness model.

### Usage

```typescript
// String format
new Color('hsv(0, 100%, 100%)');      // Red

// Object format
new Color({ h: 0, s: 100, v: 100, a: 1 });

// Convert to HSV
color.toHsv();       // 'hsv(0, 100%, 100%)'
color.getHsvObject(); // { h: 0, s: 100, v: 100, a: 1 }
```

### Characteristics

- **Hue**: 0-360° (same as HSL)
- **Saturation**: 0-100% (different from HSL)
- **Value**: 0-100% (brightness)
  - 0% = Black
  - 100% = Brightest color

### HSL vs HSV

```typescript
// Same hue, different results
const hsl = { h: 0, s: 100, l: 50 };  // Pure red
const hsv = { h: 0, s: 100, v: 100 }; // Pure red

const hsl2 = { h: 0, s: 100, l: 75 };  // Light red (pink)
const hsv2 = { h: 0, s: 50, v: 100 };  // Light red (different)
```

### Use Cases

- Color picker implementations
- Image processing
- Graphics software (Photoshop uses HSV)

---

## HWB (Hue, Whiteness, Blackness)

Intuitive color model for mixing white and black.

### Usage

```typescript
// Convert to HWB
color.toHwb();       // 'hwb(0 0% 0%)'
color.getHwbObject(); // { h: 0, w: 0, b: 0, a: 1 }
```

### Characteristics

- **Hue**: 0-360° (color)
- **Whiteness**: 0-100% (amount of white)
- **Blackness**: 0-100% (amount of black)

### Example

```typescript
// Pure red
{ h: 0, w: 0, b: 0 }

// Pink (red + white)
{ h: 0, w: 50, b: 0 }

// Dark red (red + black)
{ h: 0, w: 0, b: 50 }

// Gray (equal white and black)
{ h: 0, w: 50, b: 50 }
```

### Use Cases

- Intuitive color mixing
- Tinting and shading
- Color theory education

---

## CMYK (Cyan, Magenta, Yellow, Key/Black)

Subtractive color model for printing.

### Usage

```typescript
// Convert to CMYK
color.toCmyk();       // 'cmyk(0%, 100%, 100%, 0%)'
color.getCmykObject(); // { c: 0, m: 100, y: 100, k: 0, a: 1 }
```

### Characteristics

- **Range**: Each component 0-100%
- **Model**: Subtractive (ink on paper)
- **Key (K)**: Black ink

### Use Cases

- Print design
- Converting for printers
- Print preview

### Note

CMYK to RGB conversion is approximate. For professional printing, use proper color management systems.

```typescript
// Red in CMYK
const cmyk = { c: 0, m: 100, y: 100, k: 0 };
const rgb = cmykToRgb(cmyk); // Approximate RGB
```

---

## LAB (CIE L\*a\*b\*)

Perceptually uniform color space representing human vision.

### Usage

```typescript
// Convert to LAB
color.toLab();       // 'lab(53.24% 80.09 67.20)'
color.getLabObject(); // { l: 53.24, a: 80.09, b: 67.20, alpha: 1 }
```

### Characteristics

- **L (Lightness)**: 0-100
  - 0 = Black
  - 100 = White
- **a**: Green (-128) to Red (+128)
- **b**: Blue (-128) to Yellow (+128)

### Perceptual Uniformity

LAB is designed so that equal changes in values produce equal perceptual changes:

```typescript
// These steps look equally spaced
const lab1 = { l: 50, a: 0, b: 0 };
const lab2 = { l: 60, a: 0, b: 0 };
const lab3 = { l: 70, a: 0, b: 0 };
```

### Use Cases

- Color difference calculations (Delta E)
- Perceptually uniform gradients
- Color science
- Professional color matching

### Example

```typescript
import { colorDistance } from '@awc/utils/color';

// Calculate perceptual color distance (Delta E)
const distance = colorDistance('#ff0000', '#ff0011');
console.log(distance); // Small value = similar colors
```

---

## LCH (Lightness, Chroma, Hue)

Cylindrical representation of LAB (easier to use).

### Usage

```typescript
// Convert to LCH
color.toLch();       // 'lch(53.24% 104.55 40.85)'
color.getLchObject(); // { l: 53.24, c: 104.55, h: 40.85, alpha: 1 }
```

### Characteristics

- **L (Lightness)**: 0-100 (same as LAB)
- **C (Chroma)**: 0-230 (color intensity)
- **H (Hue)**: 0-360° (color angle)

### Advantages over LAB

LCH is easier to manipulate than LAB:

```typescript
// Rotate hue while preserving lightness and chroma
const lch = color.getLchObject();
const rotated = { ...lch, h: (lch.h + 180) % 360 };

// Increase color intensity
const vibrant = { ...lch, c: lch.c * 1.2 };
```

### Use Cases

- Perceptually accurate color adjustments
- Better than LAB for UI work
- Professional design tools

---

## OKLAB (Modern Perceptual Color)

Improved perceptually uniform color space (better than LAB).

### Usage

```typescript
// Convert to OKLAB
color.toOklab();       // 'oklab(0.6280 0.2248 0.1258)'
color.getOklabObject(); // { l: 0.6280, a: 0.2248, b: 0.1258, alpha: 1 }
```

### Characteristics

- **L (Lightness)**: 0-1 (0 = black, 1 = white)
- **a**: Green (-0.4) to Red (+0.4)
- **b**: Blue (-0.4) to Yellow (+0.4)

### Why OKLAB?

OKLAB improves on LAB's perceptual uniformity:

```typescript
// Better perceptual accuracy than LAB
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'oklab');
```

### Use Cases

- Modern color science
- Better than LAB for most use cases
- Recommended for new projects

---

## OKLCH (Best for Gradients!)

Cylindrical OKLCH - the recommended format for gradients and color manipulation.

### Usage

```typescript
// Convert to OKLCH
color.toOklch();       // 'oklch(0.6280 0.2575 29.23)'
color.getOklchObject(); // { l: 0.6280, c: 0.2575, h: 29.23, alpha: 1 }
```

### Characteristics

- **L (Lightness)**: 0-1
- **C (Chroma)**: 0-0.4 (typically)
- **H (Hue)**: 0-360°

### Why OKLCH is Best

```typescript
// ✅ OKLCH - Smooth, perceptually uniform
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'oklch');
// Result: Beautiful, natural-looking gradient

// ❌ RGB - Muddy middle colors
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'rgb');
// Result: Gray/brown in the middle

// ❌ HSL - Unexpected brightness changes
const gradient = generateGradient('#ff0000', '#0000ff', 10, 'hsl');
// Result: Uneven brightness
```

### Use Cases

- **Gradients** - Best results
- **Color scales** - Data visualization
- **Design systems** - Consistent palettes
- **UI design** - Modern standard

### Example

```typescript
// Create perceptually uniform color scale
const brand = new Color('#3498db');
const oklch = brand.getOklchObject();

const scale = [
  { ...oklch, l: 0.95 }, // Very light
  { ...oklch, l: 0.75 }, // Light
  { ...oklch, l: 0.55 }, // Medium
  { ...oklch, l: 0.35 }, // Dark
  { ...oklch, l: 0.15 }, // Very dark
].map(color => new Color(color));
```

---

## XYZ (CIE XYZ)

Device-independent color space used in color science.

### Usage

```typescript
// Convert to XYZ
color.toXyz();       // 'color(xyz 21.93 12.72 3.11)'
color.getXyzObject(); // { x: 21.93, y: 12.72, z: 3.11, alpha: 1 }
```

### Characteristics

- **Range**: 0-100 (typically)
- **Device-independent**: Based on human vision
- **Intermediate format**: Used for conversions

### Use Cases

- Color science calculations
- Converting between color spaces
- Color management systems
- Not typically used directly in UI

---

## Choosing the Right Format

### Quick Decision Guide

```typescript
// 🎨 For CSS and web styling
color.toHex();  // or .toRgb()

// 🎛️ For intuitive adjustments (lightness/saturation)
color.toHsl();

// 🌈 For gradients and color scales
color.toOklch(); // Best choice!

// 🖨️ For print design
color.toCmyk();

// 📊 For data visualization
color.toOklch(); // or .toLch()

// 🧪 For color science
color.toLab(); // or .toOklab()
```

### Detailed Recommendations

| Task | Recommended | Alternative |
|------|------------|-------------|
| Web styling | RGB/Hex | HSL |
| Lightness adjustments | HSL | LCH/OKLCH |
| Saturation adjustments | HSL | LCH/OKLCH |
| Hue rotation | HSL | LCH/OKLCH |
| Gradients | **OKLCH** | LAB/LCH |
| Color scales | **OKLCH** | LAB/LCH |
| Color mixing | **OKLCH** | LAB |
| Accessibility | RGB | Any |
| Print | CMYK | RGB |
| Color science | LAB/OKLAB | XYZ |

---

## Format Comparison Examples

### Same Color in All Formats

```typescript
const color = new Color('#e74c3c'); // Red-orange

console.log({
  hex: color.toHex(),        // '#e74c3c'
  rgb: color.toRgb(),        // 'rgb(231 76 60)'
  hsl: color.toHsl(),        // 'hsl(4, 78%, 57%)'
  hsv: color.toHsv(),        // 'hsv(4, 74%, 91%)'
  hwb: color.toHwb(),        // 'hwb(4 24% 9%)'
  cmyk: color.toCmyk(),      // 'cmyk(0%, 67%, 74%, 9%)'
  lab: color.toLab(),        // 'lab(56.87% 56.40 40.36)'
  lch: color.toLch(),        // 'lch(56.87% 69.37 35.56)'
  oklab: color.toOklab(),    // 'oklab(0.6489 0.1483 0.0871)'
  oklch: color.toOklch(),    // 'oklch(0.6489 0.1717 30.44)'
});
```

### Gradient Comparison

```typescript
import { generateGradient } from '@awc/utils/color';

const start = '#ff0000';
const end = '#0000ff';

// Different color spaces produce different results
const rgbGradient = generateGradient(start, end, 5, 'rgb');
const hslGradient = generateGradient(start, end, 5, 'hsl');
const oklchGradient = generateGradient(start, end, 5, 'oklch');

// OKLCH produces the best visual results
```

---

## Advanced Topics

### Color Space for Mixing

```typescript
import { mixColors } from '@awc/utils/color';

// Mix in different color spaces
const color1 = '#ff0000';
const color2 = '#0000ff';

const rgbMix = mixColors({ color: color1, with: color2, colorSpace: 'rgb' });
const oklchMix = mixColors({ color: color1, with: color2, colorSpace: 'oklch' });

// OKLCH produces more natural-looking results
```

### Out-of-Gamut Colors

Some color spaces can represent colors that can't be displayed:

```typescript
// LAB can represent colors outside sRGB gamut
const lab = { l: 50, a: 100, b: 100 };
const rgb = labToRgb(lab);
// RGB values will be clamped to 0-255
```

### Conversion Accuracy

```typescript
// Most conversions maintain accuracy
const original = new Color('#3498db');
const roundTrip = new Color(
  oklchToRgb(
    rgbToOklch(
      original.getRgbObject()
    )
  )
);

console.log(original.toHex() === roundTrip.toHex()); // true (usually)
```

---

## Next Steps

- **[Color Class API](./color-class)** - Complete API reference
- **[Conversions](./conversions)** - Deep dive into conversions
- **[Examples](./examples)** - Real-world usage examples

---

## Summary

- **RGB**: Standard for web, not perceptually uniform
- **HSL**: Best for intuitive adjustments
- **OKLCH**: **Best for gradients and modern design** ⭐
- **LAB/LCH**: Good for color science
- **CMYK**: For print only
- Others: Special use cases

**Recommendation**: Use **OKLCH** for gradients and color scales, **HSL** for simple adjustments, and **RGB/Hex** for final output.