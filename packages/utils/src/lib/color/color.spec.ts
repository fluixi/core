// color-utils.test.ts
import { describe, it, expect } from 'vitest';
import { Color } from './color.js';
import {
  formatRgba,
  parseColor,
  isValidColor,
  rgbaToHex,
  rgbaToHsl,
  rgbaToHsv,
  rgbaToCmyk,
  calculateContrastRatio,
  adjustColor,
  mixColors,
  generatePalette,
  createContrastColor,
} from './utils.js';

describe('Color Utilities', () => {
  describe('formatRgba', () => {
    it('should format RGB values correctly', () => {
      expect(formatRgba(255, 0, 0)).toBe('rgb(255 0 0)');
      expect(formatRgba(0, 255, 0)).toBe('rgb(0 255 0)');
      expect(formatRgba(0, 0, 255)).toBe('rgb(0 0 255)');
    });

    it('should format RGBA values with alpha', () => {
      expect(formatRgba(255, 0, 0, 0.5)).toBe('rgba(255 0 0 / 0.5)');
      expect(formatRgba(0, 255, 0, 0.75)).toBe('rgba(0 255 0 / 0.75)');
    });

    it('should handle CSS variables', () => {
      expect(formatRgba(255, 0, 0, 'var(--opacity)')).toBe(
        'rgba(255 0 0 / var(--opacity))'
      );
    });
  });

  describe('parseColor', () => {
    it('should parse hex colors', () => {
      expect(parseColor('#ff0000')).toEqual([255, 0, 0, 1]);
      expect(parseColor('#00ff00')).toEqual([0, 255, 0, 1]);
      expect(parseColor('#0000ff')).toEqual([0, 0, 255, 1]);
      const hexWithAlpha = parseColor('#ff000080');
      expect(hexWithAlpha?.[0]).toBe(255);
      expect(hexWithAlpha?.[1]).toBe(0);
      expect(hexWithAlpha?.[2]).toBe(0);
      expect(hexWithAlpha?.[3]).toBeCloseTo(0.5, 2);
    });

    it('should parse RGB colors', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual([255, 0, 0, 1]);
      expect(parseColor('rgb(0 255 0)')).toEqual([0, 255, 0, 1]);
      expect(parseColor('rgba(0, 0, 255, 0.5)')).toEqual([0, 0, 255, 0.5]);
    });

    it('should parse HSL colors', () => {
      expect(parseColor('hsl(0, 100%, 50%)')).toEqual([255, 0, 0, 1]);
      expect(parseColor('hsl(120, 100%, 50%)')).toEqual([0, 255, 0, 1]);
      expect(parseColor('hsla(240, 100%, 50%, 0.5)')).toEqual([0, 0, 255, 0.5]);
    });

    it('should parse named colors', () => {
      expect(parseColor('red')).toEqual([255, 0, 0, 1]);
      expect(parseColor('green')).toEqual([0, 128, 0, 1]);
      expect(parseColor('blue')).toEqual([0, 0, 255, 1]);
      expect(parseColor('transparent')).toEqual([0, 0, 0, 0]);
    });

    it('should return null for invalid colors', () => {
      expect(parseColor('invalid')).toBeNull();
      expect(parseColor('#ggg')).toBeNull();
    });

    it('should clamp out-of-range RGB values', () => {
      // Parser clamps values to valid ranges
      expect(parseColor('rgb(300, 0, 0)')).toEqual([255, 0, 0, 1]);
      expect(parseColor('rgb(-10, 400, 500)')).toEqual([0, 255, 255, 1]);
    });
  });

  describe('isValidColor', () => {
    it('should validate hex colors', () => {
      expect(isValidColor('#fff')).toBe(true);
      expect(isValidColor('#ffffff')).toBe(true);
      expect(isValidColor('#ffffffff')).toBe(true);
      expect(isValidColor('#ggg')).toBe(false);
    });

    it('should validate RGB colors', () => {
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('rgb(255 0 0)')).toBe(true);
      expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      // Out of range values are clamped, so they're valid
      expect(isValidColor('rgb(300, 0, 0)')).toBe(true);
      // Invalid syntax should fail
      expect(isValidColor('rgb(255, 0)')).toBe(false);
      expect(isValidColor('rgb(abc, def, ghi)')).toBe(false);
    });

    it('should validate named colors', () => {
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('blue')).toBe(true);
      expect(isValidColor('unknown')).toBe(false);
    });
  });

  describe('Color conversions', () => {
    it('should convert RGBA to hex', () => {
      expect(rgbaToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbaToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbaToHex(0, 0, 255)).toBe('#0000ff');
      expect(rgbaToHex(255, 0, 0, 0.5)).toBe('#ff000080');
    });

    it('should convert RGBA to HSL', () => {
      expect(rgbaToHsl(255, 0, 0)).toBe('hsl(0, 100%, 50%)');
      expect(rgbaToHsl(0, 255, 0)).toBe('hsl(120, 100%, 50%)');
      expect(rgbaToHsl(0, 0, 255)).toBe('hsl(240, 100%, 50%)');
      expect(rgbaToHsl(255, 0, 0, 0.5)).toBe('hsla(0, 100%, 50%, 0.5)');
    });

    it('should convert RGBA to HSV', () => {
      expect(rgbaToHsv(255, 0, 0)).toBe('hsv(0, 100%, 100%)');
      expect(rgbaToHsv(0, 255, 0)).toBe('hsv(120, 100%, 100%)');
    });

    it('should convert RGBA to CMYK', () => {
      expect(rgbaToCmyk(255, 0, 0)).toBe('cmyk(0%, 100%, 100%, 0%)');
      expect(rgbaToCmyk(0, 255, 0)).toBe('cmyk(100%, 0%, 100%, 0%)');
    });
  });

  describe('Color adjustments', () => {
    it('should adjust lightness', () => {
      const color = '#ff0000';
      const lighter = adjustColor(color, { lightness: 20 });
      const darker = adjustColor(color, { lightness: -20 });

      expect(isValidColor(lighter)).toBe(true);
      expect(isValidColor(darker)).toBe(true);
    });

    it('should adjust saturation', () => {
      const color = '#ff0000';
      const saturated = adjustColor(color, { saturation: 20 });
      const desaturated = adjustColor(color, { saturation: -20 });

      expect(isValidColor(saturated)).toBe(true);
      expect(isValidColor(desaturated)).toBe(true);
    });

    it('should adjust hue', () => {
      const color = '#ff0000';
      const rotated = adjustColor(color, { hue: 120 });

      expect(isValidColor(rotated)).toBe(true);
    });

    it('should adjust alpha', () => {
      const color = '#ff0000';
      const transparent = adjustColor(color, { alpha: 0.5 });

      expect(isValidColor(transparent)).toBe(true);
    });
  });

  describe('Color mixing', () => {
    it('should mix two colors', () => {
      const mixed = mixColors({
        color: '#ff0000',
        with: '#0000ff',
        percentage: 50,
      });

      expect(isValidColor(mixed)).toBe(true);
    });

    it('should mix with transparency', () => {
      const mixed = mixColors({
        color: '#ff0000',
        with: 'transparent',
        percentage: 50,
      });

      expect(isValidColor(mixed)).toBe(true);
    });
  });

  describe('Contrast calculations', () => {
    it('should calculate contrast ratio', () => {
      expect(calculateContrastRatio('#000000', '#ffffff')).toBeGreaterThan(20);
      expect(calculateContrastRatio('#ff0000', '#00ff00')).toBeLessThan(5);
    });

    it('should create contrasting colors', () => {
      const contrast = createContrastColor('#000000');
      expect(contrast).toBe('#ffffff');

      const contrast2 = createContrastColor('#ffffff');
      expect(contrast2).toBe('#000000');
    });
  });

  describe('Palette generation', () => {
    it('should generate a palette', () => {
      const palette = generatePalette('#ff0000', { shades: 5 });

      expect(Object.keys(palette)).toHaveLength(5);
      expect(palette['50']).toBeDefined();
      expect(palette['400']).toBeDefined();

      // All generated colors should be valid
      Object.values(palette).forEach((color) => {
        expect(isValidColor(color)).toBe(true);
      });
    });

    it('should generate palette with complementary colors', () => {
      const palette = generatePalette('#ff0000', {
        shades: 3,
        includeComplementary: true,
      });

      expect(palette.complementary).toBeDefined();
      expect(isValidColor(palette.complementary!)).toBe(true);
    });
  });

  describe('Color class', () => {
    it('should create Color instances from various representations', () => {
      const color1 = new Color('#ff0000');
      const color2 = new Color([255, 0, 0]);
      const color3 = new Color({ r: 255, g: 0, b: 0 });

      expect(color1.toHex()).toBe('#ff0000');
      expect(color2.toHex()).toBe('#ff0000');
      expect(color3.toHex()).toBe('#ff0000');
    });

    it('should convert between formats', () => {
      const color = new Color('#ff0000');

      expect(color.toHex()).toBe('#ff0000');
      expect(color.toRgb()).toBe('rgb(255 0 0)');
      expect(color.toHsl()).toBe('hsl(0, 100%, 50%)');
      expect(color.toHsv()).toBe('hsv(0, 100%, 100%)');
      expect(color.toCmyk()).toBe('cmyk(0%, 100%, 100%, 0%)');
    });

    it('should adjust colors', () => {
      const color = new Color('#ff0000');

      color.lighten(20);
      expect(color.isValid()).toBe(true);

      color.darken(20);
      expect(color.isValid()).toBe(true);

      color.saturate(20);
      expect(color.isValid()).toBe(true);

      color.rotate(180);
      expect(color.isValid()).toBe(true);
    });

    it('should mix colors', () => {
      const color = new Color('#ff0000');
      color.mix('#0000ff', 50);

      expect(color.isValid()).toBe(true);
    });

    it('should get contrast color', () => {
      const color = new Color('#000000');
      const contrast = color.getContrastColor();

      expect(contrast.toHex()).toBe('#ffffff');
    });

    it('should calculate contrast ratio', () => {
      const black = new Color('#000000');
      const white = new Color('#ffffff');

      const ratio = black.getContrastRatio(white);
      expect(ratio).toBeGreaterThan(20);
    });

    it('should generate palette', () => {
      const color = new Color('#ff0000');
      const palette = color.getPalette({ shades: 5 });

      expect(Object.keys(palette)).toHaveLength(5);
    });

    it('should clone colors', () => {
      const color1 = new Color('#ff0000');
      const color2 = color1.clone();

      expect(color1.toHex()).toBe(color2.toHex());
      expect(color1).not.toBe(color2);
    });

    it('should have static color getters', () => {
      expect(Color.red.toHex()).toBe('#ff0000');
      expect(Color.green.toHex()).toBe('#00ff00');
      expect(Color.blue.toHex()).toBe('#0000ff');
      expect(Color.white.toHex()).toBe('#ffffff');
      expect(Color.black.toHex()).toBe('#000000');
    });

    it('should create random colors', () => {
      const random = Color.random();
      expect(random.isValid()).toBe(true);
    });

    it('should create from string', () => {
      const color = Color.fromString('#ff0000');
      expect(color).toBeInstanceOf(Color);
      expect(color!.toHex()).toBe('#ff0000');

      const invalid = Color.fromString('invalid');
      expect(invalid).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle edge case values', () => {
      // Out of range values should be clamped
      const color = new Color([300, -10, 500, 2]);
      expect(color.r).toBe(255);
      expect(color.g).toBe(0);
      expect(color.b).toBe(255);
      expect(color.a).toBe(1);
    });

    it('should handle invalid input gracefully', () => {
      const color = new Color('invalid');
      // Should default to black
      expect(color.toHex()).toBe('#000000');
    });

    it('should handle CSS variables', () => {
      const color = formatRgba(
        'var(--red)',
        'var(--green)',
        'var(--blue)',
        'var(--alpha)'
      );
      expect(color).toBe(
        'rgba(var(--red) var(--green) var(--blue) / var(--alpha))'
      );
    });

    it('should handle percentage values', () => {
      const color = parseColor('rgb(100%, 0%, 0%)');
      expect(color).toEqual([255, 0, 0, 1]);
    });
  });

  describe('Performance', () => {
    it('should parse colors efficiently', () => {
      const colors = [
        '#ff0000',
        '#00ff00',
        '#0000ff',
        'rgb(255, 0, 0)',
        'hsl(0, 100%, 50%)',
        'red',
        'blue',
        'green',
      ];

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        colors.forEach((color) => parseColor(color));
      }
      const end = performance.now();

      // Should parse 8000 colors in reasonable time
      expect(end - start).toBeLessThan(1000); // Less than 1 second
    });
  });
});

// /**
//  * Test function to verify all RGB patterns
//  */
// export const testAllRgbPatterns = (): Record<string, boolean> => {
//   const results: Record<string, boolean> = {};

