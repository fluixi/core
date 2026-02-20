/**
 * @fileoverview Comprehensive examples for the color management system
 * These examples demonstrate the power and flexibility of the color utilities
 */

import { Color } from './color.js';
import {
  convertColor,
  generateGradient,
  adjustTemperature,
  simulateColorBlindness,
  invertColor,
  toGrayscale,
  toSepia,
  colorDistance,
  findClosestColor,
  blendColors,
  getColorName,
  randomColor,
  isLight,
  isDark,
} from './index.js';

// ============================================================================
// EXAMPLE 1: Basic Color Creation and Conversion
// ============================================================================

export function example1_BasicColorUsage() {
  console.log('=== Example 1: Basic Color Usage ===\n');

  // Create colors in different formats
  const color1 = new Color('#3498db');
  const color2 = new Color('rgb(52, 152, 219)');
  const color3 = new Color({ r: 52, g: 152, b: 219, a: 1 });
  const color4 = new Color([52, 152, 219, 1]);

  // Convert to all supported formats
  console.log('Hex:', color1.toHex());
  console.log('RGB:', color1.toRgb());
  console.log('HSL:', color1.toHsl());
  console.log('HSV:', color1.toHsv());
  console.log('HWB:', color1.toHwb());
  console.log('CMYK:', color1.toCmyk());
  console.log('LAB:', color1.toLab());
  console.log('LCH:', color1.toLch());
  console.log('OKLAB:', color1.toOklab());
  console.log('OKLCH:', color1.toOklch());
  console.log('XYZ:', color1.toXyz());
}

// ============================================================================
// EXAMPLE 2: Color Manipulation and Chaining
// ============================================================================

export function example2_ColorManipulation() {
  console.log('\n=== Example 2: Color Manipulation ===\n');

  const baseColor = new Color('#3498db');

  // Chain multiple operations
  const modified = baseColor
    .clone()
    .lighten(20)
    .saturate(10)
    .rotate(30)
    .alpha(0.8);

  console.log('Original:', baseColor.toHex());
  console.log('Modified:', modified.toHex());

  // Individual adjustments
  const lighter = baseColor.clone().lighten(20);
  const darker = baseColor.clone().darken(20);
  const saturated = baseColor.clone().saturate(30);
  const desaturated = baseColor.clone().desaturate(30);
  const rotated = baseColor.clone().rotate(180);

  console.log('Lighter:', lighter.toHex());
  console.log('Darker:', darker.toHex());
  console.log('Saturated:', saturated.toHex());
  console.log('Desaturated:', desaturated.toHex());
  console.log('Rotated:', rotated.toHex());
}

// ============================================================================
// EXAMPLE 3: Color Harmonies and Schemes
// ============================================================================

export function example3_ColorHarmonies() {
  console.log('\n=== Example 3: Color Harmonies ===\n');

  const baseColor = new Color('#e74c3c');

  // Complementary colors
  const complementary = baseColor.getHarmony({ type: 'complementary' });
  console.log('Complementary:', complementary.map((c) => c.toHex()));

  // Analogous colors
  const analogous = baseColor.getHarmony({ type: 'analogous' });
  console.log('Analogous:', analogous.map((c) => c.toHex()));

  // Triadic colors
  const triadic = baseColor.getHarmony({ type: 'triadic' });
  console.log('Triadic:', triadic.map((c) => c.toHex()));

  // Tetradic colors
  const tetradic = baseColor.getHarmony({ type: 'tetradic' });
  console.log('Tetradic:', tetradic.map((c) => c.toHex()));

  // Monochromatic scheme
  const monochromatic = baseColor.getHarmony({
    type: 'monochromatic',
    count: 5,
  });
  console.log('Monochromatic:', monochromatic.map((c) => c.toHex()));
}

// ============================================================================
// EXAMPLE 4: Palette Generation
// ============================================================================

export function example4_PaletteGeneration() {
  console.log('\n=== Example 4: Palette Generation ===\n');

  const baseColor = new Color('#3498db');

  // Generate a complete palette
  const palette = baseColor.getPalette({
    shades: 9,
    lightnessFactor: 10,
    saturationFactor: 5,
    includeComplementary: true,
    includeAnalogous: true,
  });

  console.log('Generated Palette:');
  Object.entries(palette).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

// ============================================================================
// EXAMPLE 5: Perceptually Uniform Gradients
// ============================================================================

export function example5_Gradients() {
  console.log('\n=== Example 5: Gradients ===\n');

  const start = '#ff0000';
  const end = '#0000ff';

  // Different color spaces produce different results
  const rgbGradient = generateGradient(start, end, 5, 'rgb');
  const hslGradient = generateGradient(start, end, 5, 'hsl');
  const labGradient = generateGradient(start, end, 5, 'lab');
  const oklchGradient = generateGradient(start, end, 5, 'oklch');

  console.log('RGB Gradient:', rgbGradient.map((c) => c.toHex()));
  console.log('HSL Gradient:', hslGradient.map((c) => c.toHex()));
  console.log('LAB Gradient:', labGradient.map((c) => c.toHex()));
  console.log('OKLCH Gradient:', oklchGradient.map((c) => c.toHex()));
}

// ============================================================================
// EXAMPLE 6: Accessibility Features
// ============================================================================

export function example6_Accessibility() {
  console.log('\n=== Example 6: Accessibility ===\n');

  const color = new Color('#3498db');

  // Check luminance
  console.log('Luminance:', color.getLuminance());
  console.log('Is Light:', isLight(color));
  console.log('Is Dark:', isDark(color));

  // Calculate contrast ratios
  const contrastWhite = color.getContrastRatio('#ffffff');
  const contrastBlack = color.getContrastRatio('#000000');

  console.log('Contrast with white:', contrastWhite.toFixed(2));
  console.log('Contrast with black:', contrastBlack.toFixed(2));

  // WCAG compliance
  console.log('WCAG AA (normal text):', contrastWhite >= 4.5 ? '✓' : '✗');
  console.log('WCAG AAA (normal text):', contrastWhite >= 7 ? '✓' : '✗');
  console.log('WCAG AA (large text):', contrastWhite >= 3 ? '✓' : '✗');

  // Get accessible contrast color
  const contrastColor = color.getContrastColor({
    targetRatio: 4.5,
    lightColor: '#ffffff',
    darkColor: '#000000',
  });

  console.log('Accessible contrast color:', contrastColor.toHex());
}

// ============================================================================
// EXAMPLE 7: Color Blindness Simulation
// ============================================================================

export function example7_ColorBlindness() {
  console.log('\n=== Example 7: Color Blindness Simulation ===\n');

  const color = new Color('#e74c3c');

  console.log('Original:', color.toHex());

  const protanopia = simulateColorBlindness(color, 'protanopia');
  console.log('Protanopia (red-blind):', protanopia.toHex());

  const deuteranopia = simulateColorBlindness(color, 'deuteranopia');
  console.log('Deuteranopia (green-blind):', deuteranopia.toHex());

  const tritanopia = simulateColorBlindness(color, 'tritanopia');
  console.log('Tritanopia (blue-blind):', tritanopia.toHex());

  const achromatopsia = simulateColorBlindness(color, 'achromatopsia');
  console.log('Achromatopsia (no color):', achromatopsia.toHex());
}

// ============================================================================
// EXAMPLE 8: Temperature Adjustment
// ============================================================================

export function example8_Temperature() {
  console.log('\n=== Example 8: Temperature Adjustment ===\n');

  const color = new Color('#3498db');

  // Make warmer
  const warm = adjustTemperature(color, {
    temperature: 5000,
    intensity: 0.5,
  });
  console.log('Warmer:', warm.toHex());

  // Make cooler
  const cool = adjustTemperature(color, {
    temperature: -5000,
    intensity: 0.5,
  });
  console.log('Cooler:', cool.toHex());
}

// ============================================================================
// EXAMPLE 9: Image Effects
// ============================================================================

export function example9_ImageEffects() {
  console.log('\n=== Example 9: Image Effects ===\n');

  const color = new Color('#e74c3c');

  // Inversion
  const inverted = invertColor(color);
  console.log('Inverted:', inverted.toHex());

  const bwInverted = invertColor(color, true);
  console.log('BW Inverted:', bwInverted.toHex());

  // Grayscale
  const grayAverage = toGrayscale(color, 'average');
  const grayLuminosity = toGrayscale(color, 'luminosity');
  const grayLightness = toGrayscale(color, 'lightness');

  console.log('Grayscale (average):', grayAverage.toHex());
  console.log('Grayscale (luminosity):', grayLuminosity.toHex());
  console.log('Grayscale (lightness):', grayLightness.toHex());

  // Sepia
  const sepia = toSepia(color, 1);
  console.log('Sepia:', sepia.toHex());
}

// ============================================================================
// EXAMPLE 10: Color Distance and Finding
// ============================================================================

export function example10_ColorDistance() {
  console.log('\n=== Example 10: Color Distance ===\n');

  const color1 = new Color('#e74c3c');
  const color2 = new Color('#e84e3e');
  const color3 = new Color('#3498db');

  const distance12 = colorDistance(color1, color2);
  const distance13 = colorDistance(color1, color3);

  console.log('Distance (similar colors):', distance12.toFixed(2));
  console.log('Distance (different colors):', distance13.toFixed(2));

  // Find closest from palette
  const palette = [
    '#e74c3c',
    '#3498db',
    '#2ecc71',
    '#f39c12',
    '#9b59b6',
    '#1abc9c',
  ];

  const target = new Color('#e84e3e');
  const closest = findClosestColor(target, palette);

  console.log('Target:', target.toHex());
  console.log('Closest from palette:', closest.toHex());
}

// ============================================================================
// EXAMPLE 11: Blending Modes
// ============================================================================

export function example11_Blending() {
  console.log('\n=== Example 11: Blending Modes ===\n');

  const base = new Color('#ff0000');
  const blend = new Color('#0000ff');

  const multiply = blendColors(base, blend, 'multiply');
  const screen = blendColors(base, blend, 'screen');
  const overlay = blendColors(base, blend, 'overlay');
  const normal = blendColors(base, blend, 'normal', 0.5);

  console.log('Base:', base.toHex());
  console.log('Blend:', blend.toHex());
  console.log('Multiply:', multiply.toHex());
  console.log('Screen:', screen.toHex());
  console.log('Overlay:', overlay.toHex());
  console.log('Normal (50%):', normal.toHex());
}

// ============================================================================
// EXAMPLE 12: Color Naming and Analysis
// ============================================================================

export function example12_ColorAnalysis() {
  console.log('\n=== Example 12: Color Analysis ===\n');

  const colors = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#808080',
    '#ffffff',
    '#000000',
  ];

  colors.forEach((hex) => {
    const color = new Color(hex);
    const name = getColorName(color);
    console.log(`${hex} -> ${name}`);
  });
}

// ============================================================================
// EXAMPLE 13: Random Color Generation
// ============================================================================

export function example13_RandomColors() {
  console.log('\n=== Example 13: Random Colors ===\n');

  // Completely random
  const random1 = randomColor();
  console.log('Random:', random1.toHex());

  // Constrained random - pastel colors
  const pastel = randomColor({
    hue: [0, 360],
    saturation: [20, 40],
    lightness: [70, 90],
  });
  console.log('Pastel:', pastel.toHex());

  // Constrained random - vibrant blues
  const vibrantBlue = randomColor({
    hue: [200, 250],
    saturation: [80, 100],
    lightness: [40, 60],
  });
  console.log('Vibrant Blue:', vibrantBlue.toHex());

  // Multiple random colors
  const randomPalette = Array.from({ length: 5 }, () => randomColor());
  console.log('Random Palette:', randomPalette.map((c) => c.toHex()));
}

// ============================================================================
// EXAMPLE 14: Complete Conversion Matrix
// ============================================================================

export function example14_ConversionMatrix() {
  console.log('\n=== Example 14: Complete Conversion Matrix ===\n');

  const rgb = { r: 128, g: 64, b: 200, a: 1 };

  console.log('Starting with RGB:', rgb);
  console.log('');

  // Convert to all formats
  const hsl = convertColor(rgb, 'hsl');
  console.log('HSL:', hsl);

  const hsv = convertColor(rgb, 'hsv');
  console.log('HSV:', hsv);

  const hwb = convertColor(rgb, 'hwb');
  console.log('HWB:', hwb);

  const cmyk = convertColor(rgb, 'cmyk');
  console.log('CMYK:', cmyk);

  const xyz = convertColor(rgb, 'xyz');
  console.log('XYZ:', xyz);

  const lab = convertColor(rgb, 'lab');
  console.log('LAB:', lab);

  const lch = convertColor(rgb, 'lch');
  console.log('LCH:', lch);

  const oklab = convertColor(rgb, 'oklab');
  console.log('OKLAB:', oklab);

  const oklch = convertColor(rgb, 'oklch');
  console.log('OKLCH:', oklch);
}

// ============================================================================
// EXAMPLE 15: Theme Generation
// ============================================================================

export function example15_ThemeGeneration() {
  console.log('\n=== Example 15: Complete Theme Generation ===\n');

  const brandColor = new Color('#3498db');

  const theme = {
    // Primary colors
    primary: brandColor.toHex(),
    primaryLight: brandColor.clone().lighten(15).toHex(),
    primaryDark: brandColor.clone().darken(15).toHex(),
    primaryLighter: brandColor.clone().lighten(30).toHex(),
    primaryDarker: brandColor.clone().darken(30).toHex(),

    // Secondary (complementary)
    secondary: brandColor.getHarmony({ type: 'complementary' })[0].toHex(),

    // Accent colors (triadic)
    accents: brandColor.getHarmony({ type: 'triadic' }).map((c) => c.toHex()),

    // Neutral colors
    neutrals: brandColor
      .clone()
      .desaturate(90)
      .getPalette({ shades: 9 }),

    // State colors
    success: new Color('#2ecc71').toHex(),
    warning: new Color('#f39c12').toHex(),
    error: new Color('#e74c3c').toHex(),
    info: brandColor.toHex(),

    // Text colors based on contrast
    textOnPrimary: brandColor.getContrastColor().toHex(),
    textOnLight: new Color('#ffffff').getContrastColor().toHex(),
    textOnDark: new Color('#000000').getContrastColor().toHex(),
  };

  console.log('Generated Theme:', JSON.stringify(theme, null, 2));
}

// ============================================================================
// Run all examples
// ============================================================================

export function runAllExamples() {
  example1_BasicColorUsage();
  example2_ColorManipulation();
  example3_ColorHarmonies();
  example4_PaletteGeneration();
  example5_Gradients();
  example6_Accessibility();
  example7_ColorBlindness();
  example8_Temperature();
  example9_ImageEffects();
  example10_ColorDistance();
  example11_Blending();
  example12_ColorAnalysis();
  example13_RandomColors();
  example14_ConversionMatrix();
  example15_ThemeGeneration();
}

// Uncomment to run examples
// runAllExamples();
