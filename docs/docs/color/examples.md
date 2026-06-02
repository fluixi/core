---
sidebar_position: 8
title: Examples
description: Real-world examples and use cases for the color management system
---

# Examples

Practical examples showing how to use the color management system in real-world scenarios.

## Basic Examples

### Creating a Color Theme

Generate a complete theme from a single brand color:

```typescript
import { Color } from '@fluixi/utils/color';

function createTheme(brandColor: string) {
  const primary = new Color(brandColor);
  
  return {
    // Primary colors
    primary: primary.toHex(),
    primaryLight: primary.clone().lighten(15).toHex(),
    primaryDark: primary.clone().darken(15).toHex(),
    primaryLighter: primary.clone().lighten(30).toHex(),
    primaryDarker: primary.clone().darken(30).toHex(),
    
    // Secondary (complementary)
    secondary: primary.getHarmony({ type: 'complementary' })[0].toHex(),
    
    // Accent colors (triadic)
    accent1: primary.getHarmony({ type: 'triadic' })[0].toHex(),
    accent2: primary.getHarmony({ type: 'triadic' })[1].toHex(),
    
    // Neutral colors
    neutrals: primary
      .clone()
      .desaturate(90)
      .getPalette({ shades: 9 }),
    
    // State colors
    success: new Color('#10b981').toHex(),
    warning: new Color('#f59e0b').toHex(),
    error: new Color('#ef4444').toHex(),
    info: primary.toHex(),
    
    // Text colors
    textOnPrimary: primary.getContrastColor().toHex(),
    textOnLight: new Color('#ffffff').getContrastColor().toHex(),
    textOnDark: new Color('#000000').getContrastColor().toHex(),
  };
}

// Usage
const theme = createTheme('#3498db');
console.log(theme);
```

### Material Design Palette

Generate a Material Design-style color palette:

```typescript
import { Color } from '@fluixi/utils/color';

function generateMaterialPalette(baseColor: string) {
  const color = new Color(baseColor);
  
  const palette = color.getPalette({
    shades: 10,
    lightnessFactor: 10,
    saturationFactor: 5,
  });
  
  return {
    50: palette['50'],
    100: palette['100'],
    200: palette['200'],
    300: palette['300'],
    400: palette['400'],
    500: palette['500'],  // Base color
    600: palette['600'],
    700: palette['700'],
    800: palette['800'],
    900: palette['900'],
  };
}

const blue = generateMaterialPalette('#2196f3');
const red = generateMaterialPalette('#f44336');
const green = generateMaterialPalette('#4caf50');
```

### Color Picker with Live Preview

Create a color picker with real-time variations:

```typescript
import { Color, isLight } from '@fluixi/utils/color';

function createColorVariations(hex: string) {
  if (!hex.startsWith('#')) return null;
  
  const color = new Color(hex);
  
  return {
    original: {
      hex: color.toHex(),
      rgb: color.toRgb(),
      hsl: color.toHsl(),
      oklch: color.toOklch(),
    },
    
    variations: {
      lighter: color.clone().lighten(20).toHex(),
      darker: color.clone().darken(20).toHex(),
      saturated: color.clone().saturate(30).toHex(),
      desaturated: color.clone().desaturate(30).toHex(),
      complementary: color.getHarmony({ type: 'complementary' })[0].toHex(),
    },
    
    harmonies: {
      analogous: color.getHarmony({ type: 'analogous' }).map(c => c.toHex()),
      triadic: color.getHarmony({ type: 'triadic' }).map(c => c.toHex()),
      tetradic: color.getHarmony({ type: 'tetradic' }).map(c => c.toHex()),
    },
    
    info: {
      isLight: isLight(color),
      luminance: color.getLuminance(),
      contrastWithWhite: color.getContrastRatio('#ffffff'),
      contrastWithBlack: color.getContrastRatio('#000000'),
    },
  };
}

// Usage
const variations = createColorVariations('#3498db');
```

## Advanced Examples

### Data Visualization Color Scale

Create perceptually uniform color scales for data visualization:

```typescript
import { generateGradient, Color } from '@fluixi/utils/color';

function createDataScale(
  startColor: string,
  endColor: string,
  steps: number
) {
  // Use OKLCH for perceptually uniform steps
  const colors = generateGradient(startColor, endColor, steps, 'oklch');
  
  return {
    colors: colors.map(c => c.toHex()),
    rgbColors: colors.map(c => c.toRgb()),
    
    // Get color at specific data point
    getColorForValue: (value: number, min: number, max: number) => {
      const normalized = (value - min) / (max - min);
      const index = Math.round(normalized * (steps - 1));
      return colors[index].toHex();
    },
  };
}

// Diverging scale (for positive/negative data)
function createDivergingScale(steps = 11) {
  const negative = generateGradient('#d73027', '#f7f7f7', Math.ceil(steps / 2), 'oklch');
  const positive = generateGradient('#f7f7f7', '#4575b4', Math.floor(steps / 2), 'oklch');
  
  return [...negative, ...positive.slice(1)].map(c => c.toHex());
}

// Sequential scale (for magnitude data)
const heatmapScale = createDataScale('#fff5f0', '#67000d', 9);
const blueScale = createDataScale('#f7fbff', '#08519c', 9);
const diverging = createDivergingScale(11);
```

### Accessible Color System

Ensure all colors meet WCAG accessibility requirements:

```typescript
import { Color } from '@fluixi/utils/color';

interface AccessibleColorSystem {
  background: string;
  text: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  wcagLevel: 'AA' | 'AAA';
}

function createAccessibleColorSystem(
  bgColor: string,
  primaryColor: string,
  secondaryColor: string,
  targetLevel: 'AA' | 'AAA' = 'AA'
): AccessibleColorSystem {
  const background = new Color(bgColor);
  const primary = new Color(primaryColor);
  const secondary = new Color(secondaryColor);
  
  const targetRatio = targetLevel === 'AAA' ? 7 : 4.5;
  
  // Ensure text has enough contrast on background
  const text = background.getContrastColor({
    targetRatio,
    lightColor: '#ffffff',
    darkColor: '#000000',
  });
  
  // Ensure text has enough contrast on primary
  const primaryText = primary.getContrastColor({
    targetRatio,
  });
  
  // Ensure text has enough contrast on secondary
  const secondaryText = secondary.getContrastColor({
    targetRatio,
  });
  
  return {
    background: background.toHex(),
    text: text.toHex(),
    primary: primary.toHex(),
    primaryText: primaryText.toHex(),
    secondary: secondary.toHex(),
    secondaryText: secondaryText.toHex(),
    wcagLevel: targetLevel,
  };
}

// Usage
const lightTheme = createAccessibleColorSystem('#ffffff', '#3498db', '#e74c3c', 'AA');
const darkTheme = createAccessibleColorSystem('#1a1a1a', '#3498db', '#e74c3c', 'AA');
```

### Color Blindness Testing

Test how your colors appear to colorblind users:

```typescript
import { Color, simulateColorBlindness } from '@fluixi/utils/color';

function testColorBlindness(colors: string[]) {
  const types = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const;
  
  return colors.map(hex => {
    const color = new Color(hex);
    
    return {
      original: hex,
      simulations: {
        protanopia: simulateColorBlindness(color, 'protanopia').toHex(),
        deuteranopia: simulateColorBlindness(color, 'deuteranopia').toHex(),
        tritanopia: simulateColorBlindness(color, 'tritanopia').toHex(),
        achromatopsia: simulateColorBlindness(color, 'achromatopsia').toHex(),
      },
      // Check if colors are still distinguishable
      warnings: types.filter(type => {
        const simulated = simulateColorBlindness(color, type);
        // Check contrast with other colors
        return colors.some(otherHex => {
          if (hex === otherHex) return false;
          const other = new Color(otherHex);
          const otherSimulated = simulateColorBlindness(other, type);
          return simulated.getContrastRatio(otherSimulated) < 3;
        });
      }),
    };
  });
}

// Usage
const brandColors = ['#e74c3c', '#3498db', '#2ecc71'];
const analysis = testColorBlindness(brandColors);
```

### Dynamic Theming

Implement dynamic theme switching with proper contrast:

```typescript
import { Color, isLight } from '@fluixi/utils/color';

interface ThemeMode {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

function generateDynamicTheme(
  primaryColor: string,
  isDarkMode: boolean
): ThemeMode {
  const primary = new Color(primaryColor);
  const palette = primary.getPalette({ shades: 9 });
  
  if (isDarkMode) {
    return {
      mode: 'dark',
      colors: {
        background: palette['900'],
        surface: palette['800'],
        primary: palette['500'],
        secondary: palette['300'],
        text: palette['50'],
        textSecondary: palette['300'],
        border: palette['700'],
      },
    };
  } else {
    return {
      mode: 'light',
      colors: {
        background: palette['50'],
        surface: palette['100'],
        primary: palette['500'],
        secondary: palette['700'],
        text: palette['900'],
        textSecondary: palette['600'],
        border: palette['300'],
      },
    };
  }
}

// Usage with theme toggle
let isDark = false;

function toggleTheme() {
  isDark = !isDark;
  const theme = generateDynamicTheme('#3498db', isDark);
  applyTheme(theme);
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}
```

### Gradient Background Generator

Create beautiful gradient backgrounds:

```typescript
import { generateGradient, Color } from '@fluixi/utils/color';

interface GradientConfig {
  colors: string[];
  direction?: string;
  type?: 'linear' | 'radial';
}

function createGradientCSS(config: GradientConfig): string {
  const { colors, direction = '135deg', type = 'linear' } = config;
  
  if (colors.length < 2) {
    throw new Error('At least 2 colors required');
  }
  
  // Generate smooth intermediate colors
  const totalSteps = 10;
  const stepsPerSegment = Math.floor(totalSteps / (colors.length - 1));
  
  let allColors: Color[] = [];
  for (let i = 0; i < colors.length - 1; i++) {
    const segment = generateGradient(
      colors[i],
      colors[i + 1],
      stepsPerSegment,
      'oklch'
    );
    allColors = allColors.concat(segment);
  }
  
  // Add final color
  allColors.push(new Color(colors[colors.length - 1]));
  
  const stops = allColors.map((color, index) => {
    const position = (index / (allColors.length - 1)) * 100;
    return `${color.toHex()} ${position.toFixed(1)}%`;
  }).join(', ');
  
  if (type === 'radial') {
    return `radial-gradient(circle, ${stops})`;
  }
  
  return `linear-gradient(${direction}, ${stops})`;
}

// Usage
const sunset = createGradientCSS({
  colors: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
  direction: '135deg',
});

const ocean = createGradientCSS({
  colors: ['#667eea', '#764ba2', '#f093fb'],
  direction: '180deg',
});

const mesh = createGradientCSS({
  colors: ['#ee0979', '#ff6a00', '#ffaa00', '#c1d82f'],
  type: 'radial',
});
```

### Smart Color Naming

Generate descriptive names for colors:

```typescript
import { Color, getColorName } from '@fluixi/utils/color';

function generateColorName(hex: string): string {
  const color = new Color(hex);
  const hsl = color.getHslObject();
  
  // Get base name
  const baseName = getColorName(color);
  
  // Add descriptive modifiers
  let modifiers: string[] = [];
  
  // Lightness modifiers
  if (hsl.l > 90) modifiers.push('very light');
  else if (hsl.l > 70) modifiers.push('light');
  else if (hsl.l < 20) modifiers.push('very dark');
  else if (hsl.l < 40) modifiers.push('dark');
  
  // Saturation modifiers
  if (hsl.s < 20) modifiers.push('dull');
  else if (hsl.s > 80) modifiers.push('vivid');
  
  // Combine
  return modifiers.length > 0
    ? `${modifiers.join(' ')} ${baseName}`
    : baseName;
}

// Create color palette with names
function createNamedPalette(baseColor: string) {
  const color = new Color(baseColor);
  const palette = color.getPalette({ shades: 9 });
  
  return Object.entries(palette).reduce((acc, [shade, hex]) => {
    acc[shade] = {
      hex,
      name: generateColorName(hex),
    };
    return acc;
  }, {} as Record<string, { hex: string; name: string }>);
}

// Usage
const namedPalette = createNamedPalette('#3498db');
// {
//   '50': { hex: '#e3f2fd', name: 'very light blue' },
//   '100': { hex: '#bbdefb', name: 'light blue' },
//   ...
// }
```

### Image Color Extraction

Extract dominant colors from an image (browser):

```typescript
import { Color, findClosestColor } from '@fluixi/utils/color';

interface DominantColor {
  color: string;
  percentage: number;
  palette: string[];
}

async function extractDominantColors(
  imageUrl: string,
  maxColors: number = 5
): Promise<DominantColor[]> {
  // Load image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageUrl;
  
  await new Promise((resolve) => (img.onload = resolve));
  
  // Draw to canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  // Sample pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  // Collect colors (sample every 10th pixel for performance)
  const colorCounts = new Map<string, number>();
  
  for (let i = 0; i < pixels.length; i += 40) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3] / 255;
    
    // Skip transparent pixels
    if (a < 0.5) continue;
    
    const hex = new Color([r, g, b, 1]).toHex();
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }
  
  // Sort by frequency
  const sorted = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors);
  
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  
  // Generate palette for each color
  return sorted.map(([hex, count]) => ({
    color: hex,
    percentage: (count / total) * 100,
    palette: new Color(hex).getPalette({ shades: 5 }),
  }));
}

// Usage
const colors = await extractDominantColors('/path/to/image.jpg', 5);
```

## React Examples

### Color Picker Component

```typescript
import React, { useState } from 'react';
import { Color } from '@fluixi/utils/color';

interface ColorPickerProps {
  initialColor?: string;
  onChange?: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  initialColor = '#3498db',
  onChange,
}) => {
  const [color, setColor] = useState(new Color(initialColor));
  const hsl = color.getHslObject();
  
  const updateColor = (updates: Partial<typeof hsl>) => {
    const newHsl = { ...hsl, ...updates };
    const newColor = new Color(newHsl);
    setColor(newColor);
    onChange?.(newColor.toHex());
  };
  
  return (
    <div>
      <div
        style={{
          width: '100%',
          height: '100px',
          backgroundColor: color.toHex(),
        }}
      />
      
      <div>
        <label>
          Hue: {hsl.h.toFixed(0)}°
          <input
            type="range"
            min="0"
            max="360"
            value={hsl.h}
            onChange={(e) => updateColor({ h: Number(e.target.value) })}
          />
        </label>
        
        <label>
          Saturation: {hsl.s.toFixed(0)}%
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.s}
            onChange={(e) => updateColor({ s: Number(e.target.value) })}
          />
        </label>
        
        <label>
          Lightness: {hsl.l.toFixed(0)}%
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.l}
            onChange={(e) => updateColor({ l: Number(e.target.value) })}
          />
        </label>
      </div>
      
      <p>Hex: {color.toHex()}</p>
      <p>RGB: {color.toRgb()}</p>
    </div>
  );
};
```

### Theme Provider

```typescript
import React, { createContext, useContext, useState } from 'react';
import { Color } from '@fluixi/utils/color';

interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>({
    colors: {
      primary: '#3498db',
      secondary: '#e74c3c',
      background: '#ffffff',
      text: '#000000',
    },
  });
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

## Next Steps

- [API Reference](./api-reference) - Complete function reference
- [Color Class API](./color-class) - Detailed Color class documentation
- [Advanced Features](./advanced) - Deep dive into advanced features