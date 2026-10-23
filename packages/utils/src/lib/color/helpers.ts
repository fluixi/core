import type { RGBColor, ColorTemperatureOptions } from './types.js';
import { Color } from './color.js';
import {
  rgbToHsl,
  hslToRgb,
  rgbToLab,
  labToRgb,
  rgbToOklab,
  oklabToRgb,
  rgbToOklch,
  oklchToRgb,
} from './conversions.js';

/**
 * Color temperature adjustment
 * Adjusts color temperature (warm/cool)
 */
export function adjustTemperature(
  color: string | Color,
  options: ColorTemperatureOptions = {}
): Color {
  const { temperature = 0, intensity = 0.5 } = options;
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  // Normalized temperature (-1 to 1)
  const normalizedTemp = Math.max(-1, Math.min(1, temperature / 10000));

  // Adjust RGB channels based on temperature
  let r = rgb.r;
  let g = rgb.g;
  let b = rgb.b;

  if (normalizedTemp > 0) {
    // Warmer (add red/yellow)
    r = Math.min(255, r + normalizedTemp * 255 * intensity);
    g = Math.min(255, g + normalizedTemp * 200 * intensity);
    b = Math.max(0, b - normalizedTemp * 100 * intensity);
  } else {
    // Cooler (add blue)
    const coolness = Math.abs(normalizedTemp);
    r = Math.max(0, r - coolness * 100 * intensity);
    g = Math.max(0, g - coolness * 50 * intensity);
    b = Math.min(255, b + coolness * 255 * intensity);
  }

  return new Color([Math.round(r), Math.round(g), Math.round(b), rgb.a || 1]);
}

/**
 * Simulate color blindness
 * Types: protanopia, deuteranopia, tritanopia, achromatopsia
 */
export function simulateColorBlindness(
  color: string | Color,
  type:
    | 'protanopia'
    | 'deuteranopia'
    | 'tritanopia'
    | 'achromatopsia' = 'protanopia'
): Color {
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Transformation matrices for different types of color blindness
  let matrix: number[][];

  switch (type) {
    case 'protanopia': // Red-blind
      matrix = [
        [0.56667, 0.43333, 0.0],
        [0.55833, 0.44167, 0.0],
        [0.0, 0.24167, 0.75833],
      ];
      break;

    case 'deuteranopia': // Green-blind
      matrix = [
        [0.625, 0.375, 0.0],
        [0.7, 0.3, 0.0],
        [0.0, 0.3, 0.7],
      ];
      break;

    case 'tritanopia': // Blue-blind
      matrix = [
        [0.95, 0.05, 0.0],
        [0.0, 0.43333, 0.56667],
        [0.0, 0.475, 0.525],
      ];
      break;

    case 'achromatopsia': // Complete color blindness (grayscale)
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      return new Color([
        Math.round(gray * 255),
        Math.round(gray * 255),
        Math.round(gray * 255),
        rgb.a || 1,
      ]);

    default:
      matrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
  }

  // Apply transformation
  const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
  const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
  const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

  return new Color([
    Math.round(Math.max(0, Math.min(255, newR * 255))),
    Math.round(Math.max(0, Math.min(255, newG * 255))),
    Math.round(Math.max(0, Math.min(255, newB * 255))),
    rgb.a || 1,
  ]);
}

export function invertColor(color: string | Color, bw: boolean = false): Color {
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  if (bw) {
    // Black or white inversion based on luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? Color.black : Color.white;
  }

  // RGB inversion
  return new Color([255 - rgb.r, 255 - rgb.g, 255 - rgb.b, rgb.a || 1]);
}

/**
 * Grayscale conversion
 */
export function toGrayscale(
  color: string | Color,
  method: 'average' | 'luminosity' | 'lightness' = 'luminosity'
): Color {
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  let gray: number;

  switch (method) {
    case 'average':
      gray = (rgb.r + rgb.g + rgb.b) / 3;
      break;

    case 'luminosity':
      gray = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      break;

    case 'lightness':
      gray =
        (Math.max(rgb.r, rgb.g, rgb.b) + Math.min(rgb.r, rgb.g, rgb.b)) / 2;
      break;

    default:
      gray = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  }

  const value = Math.round(gray);
  return new Color([value, value, value, rgb.a || 1]);
}

/**
 * Sepia tone effect
 */
export function toSepia(color: string | Color, intensity: number = 1): Color {
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Sepia transformation matrix
  let newR = 0.393 * r + 0.769 * g + 0.189 * b;
  let newG = 0.349 * r + 0.686 * g + 0.168 * b;
  let newB = 0.272 * r + 0.534 * g + 0.131 * b;

  // Apply intensity
  newR = r + (newR - r) * intensity;
  newG = g + (newG - g) * intensity;
  newB = b + (newB - b) * intensity;

  return new Color([
    Math.round(Math.max(0, Math.min(255, newR * 255))),
    Math.round(Math.max(0, Math.min(255, newG * 255))),
    Math.round(Math.max(0, Math.min(255, newB * 255))),
    rgb.a || 1,
  ]);
}

/**
 * Calculate color distance using Delta E (CIE2000)
 * Returns a value where 0 = identical, >100 = very different
 */
export function colorDistance(
  color1: string | Color,
  color2: string | Color
): number {
  const c1 = color1 instanceof Color ? color1 : new Color(color1);
  const c2 = color2 instanceof Color ? color2 : new Color(color2);

  const lab1 = rgbToLab(c1.getRgbObject());
  const lab2 = rgbToLab(c2.getRgbObject());

  // Simplified Delta E calculation (Euclidean distance in LAB space)
  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Find closest color from a palette
 */
export function findClosestColor(
  color: string | Color,
  palette: (string | Color)[]
): Color {
  const targetColor = color instanceof Color ? color : new Color(color);
  let closestColor: Color | null = null;
  let minDistance = Infinity;

  for (const paletteColor of palette) {
    const distance = colorDistance(targetColor, paletteColor);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor =
        paletteColor instanceof Color ? paletteColor : new Color(paletteColor);
    }
  }

  return closestColor || targetColor;
}

/**
 * Generate gradient colors
 */
export function generateGradient(
  startColor: string | Color,
  endColor: string | Color,
  steps: number = 5,
  colorSpace: 'rgb' | 'hsl' | 'lab' | 'oklab' | 'oklch' = 'rgb'
): Color[] {
  const start =
    startColor instanceof Color ? startColor : new Color(startColor);
  const end = endColor instanceof Color ? endColor : new Color(endColor);
  const colors: Color[] = [];

  if (steps < 2) {
    return [start];
  }

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);

    let interpolated: RGBColor;

    switch (colorSpace) {
      case 'hsl': {
        const hsl1 = rgbToHsl(start.getRgbObject());
        const hsl2 = rgbToHsl(end.getRgbObject());

        // Handle hue interpolation (shortest path around color wheel)
        let h1 = hsl1.h;
        let h2 = hsl2.h;
        const diff = h2 - h1;

        if (Math.abs(diff) > 180) {
          if (h1 < h2) {
            h1 += 360;
          } else {
            h2 += 360;
          }
        }

        const h = (h1 + (h2 - h1) * t) % 360;
        const s = hsl1.s + (hsl2.s - hsl1.s) * t;
        const l = hsl1.l + (hsl2.l - hsl1.l) * t;
        const a = (hsl1.a ?? 1) + ((hsl2.a ?? 1) - (hsl1.a ?? 1)) * t;

        interpolated = hslToRgb({ h, s, l, a });
        break;
      }

      case 'lab': {
        const lab1 = rgbToLab(start.getRgbObject());
        const lab2 = rgbToLab(end.getRgbObject());

        const l = lab1.l + (lab2.l - lab1.l) * t;
        const a = lab1.a + (lab2.a - lab1.a) * t;
        const b = lab1.b + (lab2.b - lab1.b) * t;
        const alpha =
          (lab1.alpha ?? 1) + ((lab2.alpha ?? 1) - (lab1.alpha ?? 1)) * t;

        interpolated = labToRgb({ l, a, b, alpha });
        break;
      }

      case 'oklab': {
        const oklab1 = rgbToOklab(start.getRgbObject());
        const oklab2 = rgbToOklab(end.getRgbObject());

        const l = oklab1.l + (oklab2.l - oklab1.l) * t;
        const a = oklab1.a + (oklab2.a - oklab1.a) * t;
        const b = oklab1.b + (oklab2.b - oklab1.b) * t;
        const alpha =
          (oklab1.alpha ?? 1) + ((oklab2.alpha ?? 1) - (oklab1.alpha ?? 1)) * t;

        interpolated = oklabToRgb({ l, a, b, alpha });
        break;
      }

      case 'oklch': {
        const oklch1 = rgbToOklch(start.getRgbObject());
        const oklch2 = rgbToOklch(end.getRgbObject());

        // Handle hue interpolation (shortest path around color wheel)
        let h1 = oklch1.h;
        let h2 = oklch2.h;
        const diff = h2 - h1;

        if (Math.abs(diff) > 180) {
          if (h1 < h2) {
            h1 += 360;
          } else {
            h2 += 360;
          }
        }

        const l = oklch1.l + (oklch2.l - oklch1.l) * t;
        const c = oklch1.c + (oklch2.c - oklch1.c) * t;
        const h = (h1 + (h2 - h1) * t) % 360;
        const alpha =
          (oklch1.alpha ?? 1) + ((oklch2.alpha ?? 1) - (oklch1.alpha ?? 1)) * t;

        interpolated = oklchToRgb({ l, c, h, alpha });
        break;
      }

      case 'rgb':
      default: {
        const rgb1 = start.getRgbObject();
        const rgb2 = end.getRgbObject();

        interpolated = {
          r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * t),
          g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * t),
          b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * t),
          a: (rgb1.a ?? 1) + ((rgb2.a ?? 1) - (rgb1.a ?? 1)) * t,
        };
        break;
      }
    }

    colors.push(new Color(interpolated));
  }

  return colors;
}

/**
 * Calculate perceptual brightness (0-1)
 */
export function getPerceivedBrightness(color: string | Color): number {
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  // Using W3C formula for perceived brightness
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/**
 * Check if color is light (brightness > 0.5)
 */
export function isLight(color: string | Color): boolean {
  return getPerceivedBrightness(color) > 0.5;
}

/**
 * Check if color is dark (brightness <= 0.5)
 */
export function isDark(color: string | Color): boolean {
  return !isLight(color);
}

/**
 * Blend two colors using various blend modes
 */
export function blendColors(
  base: string | Color,
  blend: string | Color,
  mode: 'multiply' | 'screen' | 'overlay' | 'normal' = 'normal',
  opacity: number = 1
): Color {
  const baseColor = base instanceof Color ? base : new Color(base);
  const blendColor = blend instanceof Color ? blend : new Color(blend);

  const b = baseColor.getRgbObject();
  const a = blendColor.getRgbObject();

  const blendChannel = (base: number, blend: number): number => {
    const b = base / 255;
    const a = blend / 255;

    let result: number;

    switch (mode) {
      case 'multiply':
        result = b * a;
        break;

      case 'screen':
        result = 1 - (1 - b) * (1 - a);
        break;

      case 'overlay':
        result = b < 0.5 ? 2 * b * a : 1 - 2 * (1 - b) * (1 - a);
        break;

      case 'normal':
      default:
        result = a * opacity + b * (1 - opacity);
        break;
    }

    return Math.round(Math.max(0, Math.min(255, result * 255)));
  };

  return new Color([
    blendChannel(b.r, a.r),
    blendChannel(b.g, a.g),
    blendChannel(b.b, a.b),
    b.a || 1,
  ]);
}

/**
 * Get dominant color component
 */
export function getDominantComponent(
  color: string | Color
): 'red' | 'green' | 'blue' | 'gray' {
  const colorObj = color instanceof Color ? color : new Color(color);
  const rgb = colorObj.getRgbObject();

  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);

  // Check if color is grayscale
  if (max - min < 20) {
    return 'gray';
  }

  if (rgb.r === max) return 'red';
  if (rgb.g === max) return 'green';
  return 'blue';
}

/**
 * Get color name (basic approximation)
 */
export function getColorName(color: string | Color): string {
  const colorObj = color instanceof Color ? color : new Color(color);
  const hsl = rgbToHsl(colorObj.getRgbObject());

  // Determine saturation level
  if (hsl.s < 10) {
    if (hsl.l > 90) return 'white';
    if (hsl.l < 10) return 'black';
    if (hsl.l > 60) return 'light gray';
    if (hsl.l < 40) return 'dark gray';
    return 'gray';
  }

  // Determine hue
  const h = hsl.h;
  let hueName: string;

  if (h < 15 || h >= 345) hueName = 'red';
  else if (h < 45) hueName = 'orange';
  else if (h < 75) hueName = 'yellow';
  else if (h < 165) hueName = 'green';
  else if (h < 255) hueName = 'blue';
  else if (h < 285) hueName = 'purple';
  else if (h < 315) hueName = 'magenta';
  else hueName = 'pink';

  // Add lightness modifier
  if (hsl.l < 30) return `dark ${hueName}`;
  if (hsl.l > 70) return `light ${hueName}`;

  // Add saturation modifier
  if (hsl.s < 30) return `dull ${hueName}`;
  if (hsl.s > 70) return `vivid ${hueName}`;

  return hueName;
}

/**
 * Random color generator with constraints
 */
export function randomColor(
  options: {
    hue?: [number, number];
    saturation?: [number, number];
    lightness?: [number, number];
    alpha?: number;
  } = {}
): Color {
  const {
    hue = [0, 360],
    saturation = [0, 100],
    lightness = [0, 100],
    alpha = 1,
  } = options;

  const h = hue[0] + Math.random() * (hue[1] - hue[0]);
  const s = saturation[0] + Math.random() * (saturation[1] - saturation[0]);
  const l = lightness[0] + Math.random() * (lightness[1] - lightness[0]);

  const rgb = hslToRgb({ h, s, l, a: alpha });
  return new Color(rgb);
}
