import { describe, it, expect } from 'vitest';
import {
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  rgbToHwb,
  hwbToRgb,
  rgbToCmyk,
  cmykToRgb,
  rgbToXyz,
  xyzToRgb,
  rgbToLab,
  labToRgb,
  rgbToLch,
  lchToRgb,
  rgbToOklab,
  oklabToRgb,
  rgbToOklch,
  oklchToRgb,
  convertColor,
  batchConvert,
  getConversionPath,
  hasDirectConversion,
  isValidFormat,
  getSupportedFormats,
} from './conversions.js';

describe('Color Conversions', () => {
  describe('RGB to HSL', () => {
    it('should convert red correctly', () => {
      const hsl = rgbToHsl({ r: 255, g: 0, b: 0, a: 1 });
      expect(hsl.h).toBeCloseTo(0, 1);
      expect(hsl.s).toBeCloseTo(100, 1);
      expect(hsl.l).toBeCloseTo(50, 1);
      expect(hsl.a).toBe(1);
    });

    it('should convert green correctly', () => {
      const hsl = rgbToHsl({ r: 0, g: 255, b: 0, a: 1 });
      expect(hsl.h).toBeCloseTo(120, 1);
      expect(hsl.s).toBeCloseTo(100, 1);
      expect(hsl.l).toBeCloseTo(50, 1);
    });

    it('should convert blue correctly', () => {
      const hsl = rgbToHsl({ r: 0, g: 0, b: 255, a: 1 });
      expect(hsl.h).toBeCloseTo(240, 1);
      expect(hsl.s).toBeCloseTo(100, 1);
      expect(hsl.l).toBeCloseTo(50, 1);
    });

    it('should handle grayscale', () => {
      const hsl = rgbToHsl({ r: 128, g: 128, b: 128, a: 1 });
      expect(hsl.s).toBe(0);
      expect(hsl.l).toBeCloseTo(50.2, 1);
    });

    it('should preserve alpha', () => {
      const hsl = rgbToHsl({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(hsl.a).toBe(0.5);
    });
  });

  describe('HSL to RGB', () => {
    it('should convert red correctly', () => {
      const rgb = hslToRgb({ h: 0, s: 100, l: 50, a: 1 });
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    it('should convert green correctly', () => {
      const rgb = hslToRgb({ h: 120, s: 100, l: 50, a: 1 });
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(255);
      expect(rgb.b).toBe(0);
    });

    it('should convert blue correctly', () => {
      const rgb = hslToRgb({ h: 240, s: 100, l: 50, a: 1 });
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(255);
    });

    it('should handle grayscale', () => {
      const rgb = hslToRgb({ h: 0, s: 0, l: 50, a: 1 });
      expect(rgb.r).toBeCloseTo(128, 0);
      expect(rgb.g).toBeCloseTo(128, 0);
      expect(rgb.b).toBeCloseTo(128, 0);
    });
  });

  describe('RGB to HSV', () => {
    it('should convert red correctly', () => {
      const hsv = rgbToHsv({ r: 255, g: 0, b: 0, a: 1 });
      expect(hsv.h).toBeCloseTo(0, 1);
      expect(hsv.s).toBeCloseTo(100, 1);
      expect(hsv.v).toBeCloseTo(100, 1);
    });

    it('should convert yellow correctly', () => {
      const hsv = rgbToHsv({ r: 255, g: 255, b: 0, a: 1 });
      expect(hsv.h).toBeCloseTo(60, 1);
      expect(hsv.s).toBeCloseTo(100, 1);
      expect(hsv.v).toBeCloseTo(100, 1);
    });

    it('should handle black', () => {
      const hsv = rgbToHsv({ r: 0, g: 0, b: 0, a: 1 });
      expect(hsv.s).toBe(0);
      expect(hsv.v).toBe(0);
    });
  });

  describe('HSV to RGB', () => {
    it('should convert red correctly', () => {
      const rgb = hsvToRgb({ h: 0, s: 100, v: 100, a: 1 });
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    it('should convert cyan correctly', () => {
      const rgb = hsvToRgb({ h: 180, s: 100, v: 100, a: 1 });
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(255);
      expect(rgb.b).toBe(255);
    });
  });

  describe('RGB to HWB', () => {
    it('should convert red correctly', () => {
      const hwb = rgbToHwb({ r: 255, g: 0, b: 0, a: 1 });
      expect(hwb.h).toBeCloseTo(0, 1);
      expect(hwb.w).toBeCloseTo(0, 1);
      expect(hwb.b).toBeCloseTo(0, 1);
    });

    it('should convert gray correctly', () => {
      const hwb = rgbToHwb({ r: 128, g: 128, b: 128, a: 1 });
      expect(hwb.w).toBeCloseTo(50.2, 1);
      expect(hwb.b).toBeCloseTo(49.8, 1);
    });
  });

  describe('HWB to RGB', () => {
    it('should convert red correctly', () => {
      const rgb = hwbToRgb({ h: 0, w: 0, b: 0, a: 1 });
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    it('should handle w+b > 100%', () => {
      const rgb = hwbToRgb({ h: 0, w: 60, b: 60, a: 1 });
      // Should normalize to gray
      expect(rgb.r).toBeCloseTo(rgb.g, 0);
      expect(rgb.g).toBeCloseTo(rgb.b, 0);
    });
  });

  describe('RGB to CMYK', () => {
    it('should convert red correctly', () => {
      const cmyk = rgbToCmyk({ r: 255, g: 0, b: 0, a: 1 });
      expect(cmyk.c).toBeCloseTo(0, 1);
      expect(cmyk.m).toBeCloseTo(100, 1);
      expect(cmyk.y).toBeCloseTo(100, 1);
      expect(cmyk.k).toBeCloseTo(0, 1);
    });

    it('should convert black correctly', () => {
      const cmyk = rgbToCmyk({ r: 0, g: 0, b: 0, a: 1 });
      expect(cmyk.c).toBe(0);
      expect(cmyk.m).toBe(0);
      expect(cmyk.y).toBe(0);
      expect(cmyk.k).toBe(100);
    });

    it('should convert white correctly', () => {
      const cmyk = rgbToCmyk({ r: 255, g: 255, b: 255, a: 1 });
      expect(cmyk.c).toBe(0);
      expect(cmyk.m).toBe(0);
      expect(cmyk.y).toBe(0);
      expect(cmyk.k).toBe(0);
    });
  });

  describe('CMYK to RGB', () => {
    it('should convert cyan correctly', () => {
      const rgb = cmykToRgb({ c: 100, m: 0, y: 0, k: 0, a: 1 });
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(255);
      expect(rgb.b).toBe(255);
    });

    it('should convert black correctly', () => {
      const rgb = cmykToRgb({ c: 0, m: 0, y: 0, k: 100, a: 1 });
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });
  });

  describe('RGB to XYZ', () => {
    it('should convert red correctly', () => {
      const xyz = rgbToXyz({ r: 255, g: 0, b: 0, a: 1 });
      expect(xyz.x).toBeGreaterThan(0);
      expect(xyz.y).toBeGreaterThan(0);
      expect(xyz.z).toBeGreaterThan(0);
    });

    it('should convert white correctly', () => {
      const xyz = rgbToXyz({ r: 255, g: 255, b: 255, a: 1 });
      expect(xyz.x).toBeCloseTo(95.047, 0);
      expect(xyz.y).toBeCloseTo(100, 0);
      expect(xyz.z).toBeCloseTo(108.883, 0);
    });
  });

  describe('XYZ to RGB', () => {
    it('should convert back to RGB', () => {
      const originalRgb = { r: 128, g: 64, b: 200, a: 1 };
      const xyz = rgbToXyz(originalRgb);
      const rgb = xyzToRgb(xyz);

      expect(rgb.r).toBeCloseTo(originalRgb.r, 0);
      expect(rgb.g).toBeCloseTo(originalRgb.g, 0);
      expect(rgb.b).toBeCloseTo(originalRgb.b, 0);
    });
  });

  describe('RGB to LAB', () => {
    it('should convert red correctly', () => {
      const lab = rgbToLab({ r: 255, g: 0, b: 0, a: 1 });
      expect(lab.l).toBeGreaterThan(0);
      expect(lab.a).toBeGreaterThan(0); // Positive a = red
      expect(lab.b).toBeGreaterThan(0); // Positive b = yellow
    });

    it('should convert white correctly', () => {
      const lab = rgbToLab({ r: 255, g: 255, b: 255, a: 1 });
      expect(lab.l).toBeCloseTo(100, 0);
      expect(lab.a).toBeCloseTo(0, 0);
      expect(lab.b).toBeCloseTo(0, 0);
    });

    it('should convert black correctly', () => {
      const lab = rgbToLab({ r: 0, g: 0, b: 0, a: 1 });
      expect(lab.l).toBeCloseTo(0, 0);
    });
  });

  describe('LAB to RGB', () => {
    it('should convert back to RGB', () => {
      const originalRgb = { r: 100, g: 150, b: 200, a: 1 };
      const lab = rgbToLab(originalRgb);
      const rgb = labToRgb(lab);

      expect(rgb.r).toBeCloseTo(originalRgb.r, 0);
      expect(rgb.g).toBeCloseTo(originalRgb.g, 0);
      expect(rgb.b).toBeCloseTo(originalRgb.b, 0);
    });
  });

  describe('RGB to LCH', () => {
    it('should convert red correctly', () => {
      const lch = rgbToLch({ r: 255, g: 0, b: 0, a: 1 });
      expect(lch.l).toBeGreaterThan(0);
      expect(lch.c).toBeGreaterThan(0); // Chroma > 0
      expect(lch.h).toBeGreaterThanOrEqual(0);
      expect(lch.h).toBeLessThan(360);
    });
  });

  describe('LCH to RGB', () => {
    it('should convert back to RGB', () => {
      const originalRgb = { r: 200, g: 100, b: 50, a: 1 };
      const lch = rgbToLch(originalRgb);
      const rgb = lchToRgb(lch);

      expect(rgb.r).toBeCloseTo(originalRgb.r, 0);
      expect(rgb.g).toBeCloseTo(originalRgb.g, 0);
      expect(rgb.b).toBeCloseTo(originalRgb.b, 0);
    });
  });

  describe('RGB to OKLAB', () => {
    it('should convert colors correctly', () => {
      const oklab = rgbToOklab({ r: 128, g: 64, b: 200, a: 1 });
      expect(oklab.l).toBeGreaterThan(0);
      expect(oklab.l).toBeLessThanOrEqual(1);
    });

    it('should handle white', () => {
      const oklab = rgbToOklab({ r: 255, g: 255, b: 255, a: 1 });
      expect(oklab.l).toBeCloseTo(1, 1);
      expect(oklab.a).toBeCloseTo(0, 2);
      expect(oklab.b).toBeCloseTo(0, 2);
    });
  });

  describe('OKLAB to RGB', () => {
    it('should convert back to RGB', () => {
      const originalRgb = { r: 150, g: 100, b: 200, a: 1 };
      const oklab = rgbToOklab(originalRgb);
      const rgb = oklabToRgb(oklab);

      expect(rgb.r).toBeCloseTo(originalRgb.r, 0);
      expect(rgb.g).toBeCloseTo(originalRgb.g, 0);
      expect(rgb.b).toBeCloseTo(originalRgb.b, 0);
    });
  });

  describe('RGB to OKLCH', () => {
    it('should convert colors correctly', () => {
      const oklch = rgbToOklch({ r: 255, g: 0, b: 0, a: 1 });
      expect(oklch.l).toBeGreaterThan(0);
      expect(oklch.c).toBeGreaterThan(0);
      expect(oklch.h).toBeGreaterThanOrEqual(0);
      expect(oklch.h).toBeLessThan(360);
    });
  });

  describe('OKLCH to RGB', () => {
    it('should convert back to RGB', () => {
      const originalRgb = { r: 100, g: 200, b: 150, a: 1 };
      const oklch = rgbToOklch(originalRgb);
      const rgb = oklchToRgb(oklch);

      expect(rgb.r).toBeCloseTo(originalRgb.r, 0);
      expect(rgb.g).toBeCloseTo(originalRgb.g, 0);
      expect(rgb.b).toBeCloseTo(originalRgb.b, 0);
    });
  });

  describe('Universal Converter', () => {
    it('should convert RGB to HSL', () => {
      const rgb = { r: 255, g: 0, b: 0, a: 1 };
      const hsl = convertColor(rgb, 'hsl');

      expect(hsl.h).toBeCloseTo(0, 1);
      expect(hsl.s).toBeCloseTo(100, 1);
      expect(hsl.l).toBeCloseTo(50, 1);
    });

    it('should convert RGB to OKLCH', () => {
      const rgb = { r: 128, g: 64, b: 200, a: 1 };
      const oklch = convertColor(rgb, 'oklch');

      expect(oklch.l).toBeDefined();
      expect(oklch.c).toBeDefined();
      expect(oklch.h).toBeDefined();
    });

    it('should apply rounding', () => {
      const rgb = { r: 128, g: 64, b: 200, a: 1 };
      const hsl = convertColor(rgb, 'hsl', {
        round: true,
        precision: 2
      });

      // Check that values have at most 2 decimal places
      expect(hsl.h.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should preserve alpha', () => {
      const rgb = { r: 255, g: 0, b: 0, a: 0.5 };
      const hsl = convertColor(rgb, 'hsl', { preserveAlpha: true });

      expect(hsl.a).toBe(0.5);
    });

    it('should remove alpha when not preserving', () => {
      const rgb = { r: 255, g: 0, b: 0, a: 0.5 };
      const hsl = convertColor(rgb, 'hsl', { preserveAlpha: false });

      expect(hsl.a).toBeUndefined();
    });
  });

  describe('Batch Conversion', () => {
    it('should convert multiple colors', () => {
      const colors = [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
      ];

      const hslColors = batchConvert(colors, 'hsl');

      expect(hslColors).toHaveLength(3);
      expect(hslColors[0].h).toBeCloseTo(0, 1);
      expect(hslColors[1].h).toBeCloseTo(120, 1);
      expect(hslColors[2].h).toBeCloseTo(240, 1);
    });
  });

  describe('Conversion Utilities', () => {
    it('should get conversion path', () => {
      const path1 = getConversionPath('rgb', 'hsl');
      expect(path1).toEqual(['rgb', 'hsl']);

      const path2 = getConversionPath('hsl', 'cmyk');
      expect(path2).toEqual(['hsl', 'rgb', 'cmyk']);
    });

    it('should detect direct conversion', () => {
      expect(hasDirectConversion('rgb', 'hsl')).toBe(true);
      expect(hasDirectConversion('hsl', 'cmyk')).toBe(false);
    });

    it('should validate formats', () => {
      expect(isValidFormat('rgb')).toBe(true);
      expect(isValidFormat('hsl')).toBe(true);
      expect(isValidFormat('oklch')).toBe(true);
      expect(isValidFormat('invalid')).toBe(false);
    });

    it('should get supported formats', () => {
      const formats = getSupportedFormats();
      expect(formats).toContain('rgb');
      expect(formats).toContain('hsl');
      expect(formats).toContain('oklch');
      expect(formats).toContain('lab');
    });
  });

  describe('Round-trip Conversions', () => {
    it('should maintain accuracy through RGB->HSL->RGB', () => {
      const original = { r: 128, g: 192, b: 64, a: 1 };
      const hsl = rgbToHsl(original);
      const back = hslToRgb(hsl);

      expect(back.r).toBeCloseTo(original.r, 0);
      expect(back.g).toBeCloseTo(original.g, 0);
      expect(back.b).toBeCloseTo(original.b, 0);
    });

    it('should maintain accuracy through RGB->OKLCH->RGB', () => {
      const original = { r: 150, g: 100, b: 200, a: 1 };
      const oklch = rgbToOklch(original);
      const back = oklchToRgb(oklch);

      expect(back.r).toBeCloseTo(original.r, 0);
      expect(back.g).toBeCloseTo(original.g, 0);
      expect(back.b).toBeCloseTo(original.b, 0);
    });

    it('should maintain accuracy through RGB->LAB->RGB', () => {
      const original = { r: 200, g: 150, b: 100, a: 1 };
      const lab = rgbToLab(original);
      const back = labToRgb(lab);

      expect(back.r).toBeCloseTo(original.r, 0);
      expect(back.g).toBeCloseTo(original.g, 0);
      expect(back.b).toBeCloseTo(original.b, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pure black', () => {
      const rgb = { r: 0, g: 0, b: 0, a: 1 };
      const hsl = rgbToHsl(rgb);
      const back = hslToRgb(hsl);

      expect(back.r).toBe(0);
      expect(back.g).toBe(0);
      expect(back.b).toBe(0);
    });

    it('should handle pure white', () => {
      const rgb = { r: 255, g: 255, b: 255, a: 1 };
      const hsl = rgbToHsl(rgb);
      const back = hslToRgb(hsl);

      expect(back.r).toBe(255);
      expect(back.g).toBe(255);
      expect(back.b).toBe(255);
    });

    it('should handle semi-transparent colors', () => {
      const rgb = { r: 128, g: 128, b: 128, a: 0.3 };
      const hsl = rgbToHsl(rgb);

      expect(hsl.a).toBe(0.3);
    });

    it('should clamp out-of-range RGB values', () => {
      const lab = { l: 150, a: 200, b: -200, alpha: 1 };
      const rgb = labToRgb(lab);

      expect(rgb.r).toBeGreaterThanOrEqual(0);
      expect(rgb.r).toBeLessThanOrEqual(255);
      expect(rgb.g).toBeGreaterThanOrEqual(0);
      expect(rgb.g).toBeLessThanOrEqual(255);
      expect(rgb.b).toBeGreaterThanOrEqual(0);
      expect(rgb.b).toBeLessThanOrEqual(255);
    });
  });
});
