/**
 * @fileoverview Comprehensive color conversion utilities
 * Supports conversions between: RGB, HSL, HSV, HWB, CMYK, LAB, LCH, OKLAB, OKLCH, XYZ
 */
import type { RGBColor, HSLColor, HSVColor, HWBColor, CMYKColor, LABColor, LCHColor, OKLABColor, OKLCHColor, XYZColor, ColorConversionOptions } from './types.js';
/**
 * Convert RGB to HSL
 */
export declare function rgbToHsl(rgb: RGBColor): HSLColor;
/**
 * Convert RGB to HSV
 */
export declare function rgbToHsv(rgb: RGBColor): HSVColor;
/**
 * Convert RGB to HWB
 */
export declare function rgbToHwb(rgb: RGBColor): HWBColor;
/**
 * Convert RGB to CMYK
 */
export declare function rgbToCmyk(rgb: RGBColor): CMYKColor;
/**
 * Convert RGB to XYZ
 */
export declare function rgbToXyz(rgb: RGBColor): XYZColor;
/**
 * Convert RGB to LAB
 */
export declare function rgbToLab(rgb: RGBColor): LABColor;
/**
 * Convert RGB to LCH
 */
export declare function rgbToLch(rgb: RGBColor): LCHColor;
/**
 * Convert RGB to OKLAB
 */
export declare function rgbToOklab(rgb: RGBColor): OKLABColor;
/**
 * Convert RGB to OKLCH
 */
export declare function rgbToOklch(rgb: RGBColor): OKLCHColor;
/**
 * Convert HSL to RGB
 */
export declare function hslToRgb(hsl: HSLColor): RGBColor;
/**
 * Convert HSL to HSV
 */
export declare function hslToHsv(hsl: HSLColor): HSVColor;
/**
 * Convert HSL to HWB
 */
export declare function hslToHwb(hsl: HSLColor): HWBColor;
/**
 * Convert HSV to RGB
 */
export declare function hsvToRgb(hsv: HSVColor): RGBColor;
/**
 * Convert HSV to HSL
 */
export declare function hsvToHsl(hsv: HSVColor): HSLColor;
/**
 * Convert HSV to HWB
 */
export declare function hsvToHwb(hsv: HSVColor): HWBColor;
/**
 * Convert HWB to RGB
 */
export declare function hwbToRgb(hwb: HWBColor): RGBColor;
/**
 * Convert HWB to HSL
 */
export declare function hwbToHsl(hwb: HWBColor): HSLColor;
/**
 * Convert HWB to HSV
 */
export declare function hwbToHsv(hwb: HWBColor): HSVColor;
/**
 * Convert CMYK to RGB
 */
export declare function cmykToRgb(cmyk: CMYKColor): RGBColor;
/**
 * Convert CMYK to HSL
 */
export declare function cmykToHsl(cmyk: CMYKColor): HSLColor;
/**
 * Convert CMYK to HSV
 */
export declare function cmykToHsv(cmyk: CMYKColor): HSVColor;
/**
 * Convert XYZ to RGB
 */
export declare function xyzToRgb(xyz: XYZColor): RGBColor;
/**
 * Convert XYZ to LAB
 */
export declare function xyzToLab(xyz: XYZColor): LABColor;
/**
 * Convert LAB to XYZ
 */
export declare function labToXyz(lab: LABColor): XYZColor;
/**
 * Convert LAB to RGB
 */
export declare function labToRgb(lab: LABColor): RGBColor;
/**
 * Convert LAB to LCH
 */
export declare function labToLch(lab: LABColor): LCHColor;
/**
 * Convert LCH to LAB
 */
export declare function lchToLab(lch: LCHColor): LABColor;
/**
 * Convert LCH to RGB
 */
export declare function lchToRgb(lch: LCHColor): RGBColor;
/**
 * Convert LCH to XYZ
 */
export declare function lchToXyz(lch: LCHColor): XYZColor;
/**
 * Convert OKLAB to RGB
 */
export declare function oklabToRgb(oklab: OKLABColor): RGBColor;
/**
 * Convert OKLAB to OKLCH
 */
export declare function oklabToOklch(oklab: OKLABColor): OKLCHColor;
/**
 * Convert OKLCH to OKLAB
 */
export declare function oklchToOklab(oklch: OKLCHColor): OKLABColor;
/**
 * Convert OKLCH to RGB
 */
export declare function oklchToRgb(oklch: OKLCHColor): RGBColor;
/**
 * Convert any color to RGB
 */
export declare function anyToRgb(color: RGBColor | HSLColor | HSVColor | HWBColor | CMYKColor | LABColor | LCHColor | OKLABColor | OKLCHColor | XYZColor): RGBColor;
/**
 * Generic conversion function
 */
export declare function convertColor(color: any, targetFormat: string, options?: ColorConversionOptions): any;
/**
 * Batch convert multiple colors
 */
export declare function batchConvert(colors: any[], targetFormat: string, options?: ColorConversionOptions): any[];
/**
 * Get conversion path between two formats
 */
export declare function getConversionPath(from: string, to: string): string[] | null;
/**
 * Check if direct conversion exists between two formats
 */
export declare function hasDirectConversion(from: string, to: string): boolean;
/**
 * Get all supported color formats
 */
export declare function getSupportedFormats(): string[];
/**
 * Validate color format
 */
export declare function isValidFormat(format: string): boolean;
//# sourceMappingURL=conversions.d.ts.map