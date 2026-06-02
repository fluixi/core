---
sidebar_position: 1
title: Color Management System
description: Comprehensive color utilities for TypeScript/JavaScript applications
---

# Color Management System

A powerful, comprehensive color management library for TypeScript/JavaScript with support for 10+ color spaces, complete conversions, and advanced color operations.

## Overview

The `@fluixi/utils/color` package provides a professional-grade color management system that supports:

- **10+ Color Formats**: RGB, HSL, HSV, HWB, CMYK, LAB, LCH, OKLAB, OKLCH, XYZ
- **Complete Conversions**: Convert between any supported color format
- **Advanced Operations**: Temperature adjustment, color blindness simulation, blend modes
- **Accessibility Features**: WCAG contrast checking, automatic contrast colors
- **Color Harmonies**: Generate complementary, triadic, analogous, and more
- **Perceptually Uniform**: OKLCH and LAB support for accurate gradients
- **Type-Safe**: Full TypeScript support with comprehensive types

## Quick Start

```typescript
import { Color } from '@fluixi/utils/color';

// Create a color
const color = new Color('#3498db');

// Convert to different formats
color.toHex();      // '#3498db'
color.toRgb();      // 'rgb(52 152 219)'
color.toHsl();      // 'hsl(204, 70%, 53%)'
color.toOklch();    // 'oklch(0.6319 0.1237 237.08)'

// Manipulate colors (chainable!)
color.clone()
  .lighten(20)
  .saturate(10)
  .rotate(30)
  .alpha(0.8)
  .toHex();

// Get accessible contrast
color.getContrastColor().toHex();  // Automatically picks black or white
```

## Installation

The color utilities are part of the `@fluixi/utils` package:

```bash
npm install @fluixi/utils
# or
pnpm add @fluixi/utils
# or
yarn add @fluixi/utils
```

## Core Features

### 1. Color Formats

Support for all major color spaces:

- **RGB/RGBA** - Standard web colors
- **HSL/HSLA** - Hue, Saturation, Lightness
- **HSV/HSVA** - Hue, Saturation, Value
- **HWB** - Hue, Whiteness, Blackness
- **CMYK** - Print colors (Cyan, Magenta, Yellow, Key)
- **XYZ** - CIE XYZ color space
- **LAB** - CIE L*a*b* (perceptually uniform)
- **LCH** - Lightness, Chroma, Hue (cylindrical LAB)
- **OKLAB** - Modern perceptually uniform color space
- **OKLCH** - Cylindrical OKLAB (best for gradients)

### 2. Color Conversions

Convert between any color format with high accuracy:

```typescript
import { convertColor } from '@fluixi/utils/color';

const rgb = { r: 255, g: 0, b: 0, a: 1 };
const hsl = convertColor(rgb, 'hsl');
const oklch = convertColor(rgb, 'oklch');
```

### 3. Color Manipulation

Adjust colors with intuitive methods:

```typescript
const color = new Color('#3498db');

// Lightness
color.lighten(20);
color.darken(10);

// Saturation
color.saturate(30);
color.desaturate(15);

// Hue
color.rotate(180);

// Opacity
color.alpha(0.5);
```

### 4. Color Harmonies

Generate beautiful color schemes:

```typescript
const base = new Color('#e74c3c');

// Different harmony types
base.getHarmony({ type: 'complementary' });
base.getHarmony({ type: 'analogous' });
base.getHarmony({ type: 'triadic' });
base.getHarmony({ type: 'tetradic' });
base.getHarmony({ type: 'split-complementary' });
base.getHarmony({ type: 'square' });
base.getHarmony({ type: 'monochromatic', count: 5 });
```

### 5. Accessibility

WCAG-compliant contrast checking:

```typescript
const bg = new Color('#3498db');
const text = new Color('#ffffff');

// Check contrast ratio
const ratio = bg.getContrastRatio(text);  // 3.52

// WCAG compliance
const isAA = ratio >= 4.5;      // false - needs improvement
const isAAA = ratio >= 7;       // false
const isAALarge = ratio >= 3;   // true - OK for large text

// Fix automatically
const accessibleText = bg.getContrastColor({ targetRatio: 4.5 });
```

### 6. Advanced Features

- **Perceptually Uniform Gradients** - Using OKLCH or LAB
- **Color Temperature Adjustment** - Make colors warmer or cooler
- **Color Blindness Simulation** - Test accessibility for different types
- **Blend Modes** - Multiply, screen, overlay, and more
- **Color Distance** - Calculate Delta E (perceptual difference)
- **Palette Generation** - Create complete design systems

## Documentation Structure

- **[Getting Started](./getting-started)** - Installation and basic usage
- **[Color Formats](./formats)** - All supported color formats explained
- **[Color Class API](./color-class)** - Complete Color class reference
- **[Conversions](./conversions)** - Converting between color spaces
- **[Manipulation](./manipulation)** - Adjusting and transforming colors
- **[Harmonies](./harmonies)** - Generating color schemes
- **[Accessibility](./accessibility)** - WCAG compliance and contrast
- **[Advanced Features](./advanced)** - Temperature, blend modes, and more
- **[Examples](./examples)** - Real-world usage examples
- **[API Reference](./api-reference)** - Complete function reference

## Why This Library?

### Comprehensive

- **Most Complete**: Support for 10+ color spaces with full conversions
- **Modern Standards**: Implements CSS Color Module Level 4
- **Production Ready**: Thoroughly tested with 189+ tests

### Powerful

- **Perceptually Uniform**: OKLCH and LAB for accurate color work
- **Advanced Operations**: Temperature, blend modes, color blindness simulation
- **Accessibility First**: Built-in WCAG compliance checking

### Developer Friendly

- **Type-Safe**: Full TypeScript support
- **Chainable API**: Intuitive method chaining
- **Well Documented**: Comprehensive docs with examples
- **Zero Dependencies**: Lightweight and fast

## Browser Support

Works in all modern browsers and Node.js:

- Chrome/Edge 88+
- Firefox 96+
- Safari 15+
- Node.js 14+

## Performance

The library is optimized for performance:

- RGB to HSL: ~0.01ms
- RGB to OKLCH: ~0.05ms
- Gradient generation (10 steps): ~0.5ms
- Batch conversion (100 colors): ~5ms

## License

MIT License - see LICENSE file for details

## Next Steps

- [Get Started](./getting-started) - Begin using the color system
- [Examples](./examples) - See real-world examples
- [API Reference](./api-reference) - Explore all available functions