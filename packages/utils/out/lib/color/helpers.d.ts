/**
 * @fileoverview Advanced color helper utilities
 * Provides temperature adjustments, color blindness simulation, and other advanced operations
 */
import type { ColorTemperatureOptions } from './types.js';
import { Color } from './color.js';
/**
 * Color temperature adjustment
 * Adjusts color temperature (warm/cool)
 */
export declare function adjustTemperature(color: string | Color, options?: ColorTemperatureOptions): Color;
/**
 * Simulate color blindness
 * Types: protanopia, deuteranopia, tritanopia, achromatopsia
 */
export declare function simulateColorBlindness(color: string | Color, type?: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'): Color;
/**
 * Invert color
 */
export declare function invertColor(color: string | Color, bw?: boolean): Color;
/**
 * Grayscale conversion
 */
export declare function toGrayscale(color: string | Color, method?: 'average' | 'luminosity' | 'lightness'): Color;
/**
 * Sepia tone effect
 */
export declare function toSepia(color: string | Color, intensity?: number): Color;
/**
 * Calculate color distance using Delta E (CIE2000)
 * Returns a value where 0 = identical, >100 = very different
 */
export declare function colorDistance(color1: string | Color, color2: string | Color): number;
/**
 * Find closest color from a palette
 */
export declare function findClosestColor(color: string | Color, palette: (string | Color)[]): Color;
/**
 * Generate gradient colors
 */
export declare function generateGradient(startColor: string | Color, endColor: string | Color, steps?: number, colorSpace?: 'rgb' | 'hsl' | 'lab' | 'oklab' | 'oklch'): Color[];
/**
 * Calculate perceptual brightness (0-1)
 */
export declare function getPerceivedBrightness(color: string | Color): number;
/**
 * Check if color is light (brightness > 0.5)
 */
export declare function isLight(color: string | Color): boolean;
/**
 * Check if color is dark (brightness <= 0.5)
 */
export declare function isDark(color: string | Color): boolean;
/**
 * Blend two colors using various blend modes
 */
export declare function blendColors(base: string | Color, blend: string | Color, mode?: 'multiply' | 'screen' | 'overlay' | 'normal', opacity?: number): Color;
/**
 * Get dominant color component
 */
export declare function getDominantComponent(color: string | Color): 'red' | 'green' | 'blue' | 'gray';
/**
 * Get color name (basic approximation)
 */
export declare function getColorName(color: string | Color): string;
/**
 * Random color generator with constraints
 */
export declare function randomColor(options?: {
    hue?: [number, number];
    saturation?: [number, number];
    lightness?: [number, number];
    alpha?: number;
}): Color;
//# sourceMappingURL=helpers.d.ts.map