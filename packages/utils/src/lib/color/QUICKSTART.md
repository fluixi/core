# Color System Quick Start Guide

Get started with the powerful color management system in under 5 minutes.

## Installation

```typescript
import { Color } from '@your-org/utils/color';
```

## 30-Second Start

```typescript
// Create a color
const color = new Color('#3498db');

// Convert to any format
color.toHex();      // '#3498db'
color.toRgb();      // 'rgb(52, 152, 219)'
color.toHsl();      // 'hsl(204, 70%, 53%)'
color.toOklch();    // 'oklch(0.6319 0.1237 237.08)'

// Manipulate (chainable!)
color.clone().lighten(20).saturate(10).toHex();

// Get accessible contrast
color.getContrastColor().toHex();  // Automatically picks black or white
```

## Common Tasks

### Task 1: Create a Complete Color Palette

```typescript
const brand = new Color('#3498db');
const palette = brand.getPalette({ shades: 9 });

// Result:
// {
//   '50': '#e3f2fd',
//   '100': '#bbdefb',
//   '200': '#90caf9',
//   ...
//   '900': '#0d47a1'
// }
```

### Task 2: Generate Color Schemes

```typescript
const base = new Color('#e74c3c');

// Get complementary color
const comp = base.getHarmony({ type: 'complementary' });

// Get triadic colors
const triadic = base.getHarmony({ type: 'triadic' });

// Get monochromatic shades
const mono = base.getHarmony({ type: 'monochromatic', count: 5 });
```

### Task 3: Create Perceptually Uniform Gradients

```typescript
import { generateGradient } from '@your-org/utils/color';

// Bad (perceptually uneven)
const rgbGradient = generateGradient('#ff0000', '#0000ff', 10, 'rgb');

// Good (perceptually uniform)
const oklchGradient = generateGradient('#ff0000', '#0000ff', 10, 'oklch');
```

### Task 4: Check Accessibility

```typescript
const bg = new Color('#3498db');
const text = new Color('#ffffff');

// Check contrast ratio
const ratio = bg.getContrastRatio(text);  // 3.52

// WCAG compliance
const isAA = ratio >= 4.5;      // false - needs improvement
const isAAA = ratio >= 7;       // false
const isAALarge = ratio >= 3;   // true - OK for large text

// Fix it automatically
const accessibleText = bg.getContrastColor({ targetRatio: 4.5 });
```

### Task 5: Convert Between Any Color Spaces

```typescript
import { convertColor } from '@your-org/utils/color';

const rgb = { r: 128, g: 64, b: 200, a: 1 };

// Convert to any format
const hsl = convertColor(rgb, 'hsl');
const oklch = convertColor(rgb, 'oklch');
const lab = convertColor(rgb, 'lab');

// With options
const rounded = convertColor(rgb, 'hsl', {
  round: true,
  precision: 2,
  preserveAlpha: true
});
```

## Color Spaces Explained (1 minute read)

### RGB - Standard Web Colors
```typescript
{ r: 255, g: 0, b: 0 }  // Pure red
```
**Use for:** Direct display, standard web colors

### HSL - Intuitive Adjustments
```typescript
{ h: 0, s: 100, l: 50 }  // Hue, Saturation, Lightness
```
**Use for:** Easy lightness/saturation adjustments

### OKLCH - Perceptually Uniform (★ Recommended)
```typescript
{ l: 0.63, c: 0.12, h: 237 }  // Lightness, Chroma, Hue
```
**Use for:** Gradients, color scales, professional design

### LAB - Perceptual Color Science
```typescript
{ l: 53, a: 80, b: 67 }  // Lightness, green-red, blue-yellow
```
**Use for:** Color difference calculations, scientific accuracy

### CMYK - Print Colors
```typescript
{ c: 76, m: 65, y: 0, k: 14 }  // Cyan, Magenta, Yellow, Key(black)
```
**Use for:** Print design, converting to print formats

## Advanced Features (5 minutes)

### Color Temperature

```typescript
import { adjustTemperature } from '@your-org/utils/color';

// Make warmer (sunset effect)
const warm = adjustTemperature('#3498db', {
  temperature: 5000,
  intensity: 0.5
});

// Make cooler (moonlight effect)
const cool = adjustTemperature('#ff5733', {
  temperature: -5000,
  intensity: 0.5
});
```

### Color Blindness Simulation

```typescript
import { simulateColorBlindness } from '@your-org/utils/color';

const color = new Color('#e74c3c');

// Test how your colors appear to colorblind users
const protanopia = simulateColorBlindness(color, 'protanopia');     // Red-blind
const deuteranopia = simulateColorBlindness(color, 'deuteranopia'); // Green-blind
const tritanopia = simulateColorBlindness(color, 'tritanopia');     // Blue-blind
```

### Image Effects

```typescript
import { toGrayscale, toSepia, invertColor } from '@your-org/utils/color';

const color = new Color('#e74c3c');

const gray = toGrayscale(color, 'luminosity');
const sepia = toSepia(color, 0.8);
const inverted = invertColor(color);
```

### Blend Modes

```typescript
import { blendColors } from '@your-org/utils/color';

const base = new Color('#ff0000');
const blend = new Color('#0000ff');

const multiply = blendColors(base, blend, 'multiply');
const screen = blendColors(base, blend, 'screen');
const overlay = blendColors(base, blend, 'overlay');
```

### Color Analysis

```typescript
import { getColorName, isLight, isDark } from '@your-org/utils/color';

const color = new Color('#3498db');

console.log(getColorName(color));  // 'light blue'
console.log(isLight(color));       // true
console.log(isDark(color));        // false
```

## Real-World Examples

### Example 1: Design System Theme

```typescript
function createTheme(brandColor: string) {
  const brand = new Color(brandColor);
  
  return {
    primary: brand.toHex(),
    primaryLight: brand.clone().lighten(15).toHex(),
    primaryDark: brand.clone().darken(15).toHex(),
    secondary: brand.getHarmony({ type: 'complementary' })[0].toHex(),
    accents: brand.getHarmony({ type: 'triadic' }).map(c => c.toHex()),
    palette: brand.getPalette({ shades: 9 }),
    textOnPrimary: brand.getContrastColor().toHex()
  };
}

const theme = createTheme('#3498db');
```

### Example 2: Data Visualization Scale

```typescript
import { generateGradient } from '@your-org/utils/color';

function createColorScale(start: string, end: string, steps: number) {
  // Use OKLCH for perceptually uniform steps
  return generateGradient(start, end, steps, 'oklch')
    .map(color => color.toHex());
}

const scale = createColorScale('#ff0000', '#0000ff', 10);
// Perfect for heatmaps, choropleth maps, etc.
```

### Example 3: Accessible Color Picker

```typescript
function ensureAccessibility(
  color: Color, 
  background: Color,
  minRatio: number = 4.5
): Color {
  const ratio = color.getContrastRatio(background);
  
  if (ratio >= minRatio) {
    return color;
  }
  
  // Auto-fix
  return color.getContrastColor({
    targetRatio: minRatio,
    lightColor: '#ffffff',
    darkColor: '#000000'
  });
}
```

### Example 4: Dynamic Theming

```typescript
function generateDynamicTheme(baseColor: string, isDarkMode: boolean) {
  const color = new Color(baseColor);
  const palette = color.getPalette({ shades: 9 });
  
  return {
    background: isDarkMode ? palette['900'] : palette['50'],
    surface: isDarkMode ? palette['800'] : palette['100'],
    primary: palette['500'],
    text: isDarkMode ? palette['50'] : palette['900'],
    border: isDarkMode ? palette['700'] : palette['300']
  };
}
```

## Pro Tips

### 1. Clone Before Modifying
```typescript
const original = new Color('#3498db');
const modified = original.clone().lighten(20);  // ✓ Good

// Don't:
original.lighten(20);  // ✗ Mutates original
```

### 2. Use OKLCH for Smooth Gradients
```typescript
// ✓ Perceptually uniform
generateGradient('#ff0000', '#0000ff', 10, 'oklch');

// ✗ Muddy middle colors
generateGradient('#ff0000', '#0000ff', 10, 'rgb');
```

### 3. Check Accessibility Early
```typescript
// ✓ Good practice
const text = bg.getContrastColor({ targetRatio: 4.5 });

// ✗ Manual checking
if (bg.getContrastRatio('#fff') < 4.5) { /* fix it */ }
```

### 4. Batch Operations Are Faster
```typescript
import { batchConvert } from '@your-org/utils/color';

// ✓ Faster for multiple colors
const converted = batchConvert(colors, 'oklch');

// ✗ Slower
colors.map(c => convertColor(c, 'oklch'));
```

### 5. Use Color Names for Readability
```typescript
// ✓ Readable
const primary = Color.blue;
const error = Color.red;

// ✗ Less readable
const primary = new Color('#0000ff');
const error = new Color('#ff0000');
```

## Cheat Sheet

| Task | Code |
|------|------|
| Create color | `new Color('#3498db')` |
| Lighten | `color.lighten(20)` |
| Darken | `color.darken(20)` |
| Saturate | `color.saturate(30)` |
| Desaturate | `color.desaturate(30)` |
| Rotate hue | `color.rotate(180)` |
| Set opacity | `color.alpha(0.5)` |
| Mix colors | `color.mix('#fff', 50)` |
| To hex | `color.toHex()` |
| To RGB | `color.toRgb()` |
| To OKLCH | `color.toOklch()` |
| Contrast ratio | `color.getContrastRatio('#fff')` |
| Contrast color | `color.getContrastColor()` |
| Complementary | `color.getHarmony({ type: 'complementary' })` |
| Palette | `color.getPalette({ shades: 9 })` |
| Clone | `color.clone()` |

## Need More Help?

- **Full Documentation**: See `README.md`
- **Complete Examples**: See `examples.ts` (15 examples)
- **All Features**: See `ENHANCEMENTS.md`
- **Type Definitions**: See `types.ts`

## One-Liners

```typescript
// Random pastel color
randomColor({ saturation: [20, 40], lightness: [70, 90] })

// Invert to black or white
invertColor('#3498db', true)

// Find closest color in palette
findClosestColor('#ff3333', ['#f00', '#0f0', '#00f'])

// Color distance (Delta E)
colorDistance('#ff0000', '#ff0011')

// Get color name
getColorName('#3498db')  // 'light blue'

// Is this color light?
isLight('#3498db')  // true
```

## Start Building!

You now have everything you need to work with colors professionally. Happy coding! 🎨