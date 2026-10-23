import type {
  RGBColor,
  HSLColor,
  HSVColor,
  HWBColor,
  CMYKColor,
  LABColor,
  LCHColor,
  OKLABColor,
  OKLCHColor,
  XYZColor,
  ColorConversionOptions,
} from './types.js';

/**
 * Constants for color conversions
 */
const D65_WHITE = { x: 0.95047, y: 1.0, z: 1.08883 };
const EPSILON = 0.008856;
const KAPPA = 903.3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToPrecision(value: number, precision: number = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

// RGB CONVERSIONS

export function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
    a: rgb.a,
  };
}

export function rgbToHsv(rgb: RGBColor): HSVColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  const s = max === 0 ? 0 : delta / max;
  const v = max;

  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    v: v * 100,
    a: rgb.a,
  };
}

export function rgbToHwb(rgb: RGBColor): HWBColor {
  const hsv = rgbToHsv(rgb);
  const w = ((100 - hsv.s) * hsv.v) / 100;
  const b = 100 - hsv.v;

  return {
    h: hsv.h,
    w,
    b,
    a: rgb.a,
  };
}

export function rgbToCmyk(rgb: RGBColor): CMYKColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const k = 1 - Math.max(r, g, b);
  const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
  const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - b - k) / (1 - k);

  return {
    c: c * 100,
    m: m * 100,
    y: y * 100,
    k: k * 100,
    a: rgb.a,
  };
}

export function rgbToXyz(rgb: RGBColor): XYZColor {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ using sRGB matrix
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  return {
    x: x * 100,
    y: y * 100,
    z: z * 100,
    alpha: rgb.a,
  };
}

export function rgbToLab(rgb: RGBColor): LABColor {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

export function rgbToLch(rgb: RGBColor): LCHColor {
  const lab = rgbToLab(rgb);
  return labToLch(lab);
}

export function rgbToOklab(rgb: RGBColor): OKLABColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Linear RGB
  const lr = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const lg = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const lb = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to LMS cone space
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    alpha: rgb.a,
  };
}

export function rgbToOklch(rgb: RGBColor): OKLCHColor {
  const oklab = rgbToOklab(rgb);
  return oklabToOklch(oklab);
}

// HSL CONVERSIONS

export function hslToRgb(hsl: HSLColor): RGBColor {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsl.a,
  };
}

export function hslToHsv(hsl: HSLColor): HSVColor {
  const rgb = hslToRgb(hsl);
  return rgbToHsv(rgb);
}

export function hslToHwb(hsl: HSLColor): HWBColor {
  const rgb = hslToRgb(hsl);
  return rgbToHwb(rgb);
}

// HSV CONVERSIONS

export function hsvToRgb(hsv: HSVColor): RGBColor {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number, g: number, b: number;

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
    default:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsv.a,
  };
}

export function hsvToHsl(hsv: HSVColor): HSLColor {
  const rgb = hsvToRgb(hsv);
  return rgbToHsl(rgb);
}

export function hsvToHwb(hsv: HSVColor): HWBColor {
  const w = ((100 - hsv.s) * hsv.v) / 100;
  const b = 100 - hsv.v;

  return {
    h: hsv.h,
    w,
    b,
    a: hsv.a,
  };
}

// HWB CONVERSIONS

export function hwbToRgb(hwb: HWBColor): RGBColor {
  const h = hwb.h;
  let w = hwb.w / 100;
  let b = hwb.b / 100;

  const sum = w + b;
  if (sum > 1) {
    w /= sum;
    b /= sum;
  }

  const v = 1 - b;
  const s = v === 0 ? 0 : 1 - w / v;

  return hsvToRgb({ h, s: s * 100, v: v * 100, a: hwb.a });
}

export function hwbToHsl(hwb: HWBColor): HSLColor {
  const rgb = hwbToRgb(hwb);
  return rgbToHsl(rgb);
}

export function hwbToHsv(hwb: HWBColor): HSVColor {
  const rgb = hwbToRgb(hwb);
  return rgbToHsv(rgb);
}

// CMYK CONVERSIONS

export function cmykToRgb(cmyk: CMYKColor): RGBColor {
  const c = cmyk.c / 100;
  const m = cmyk.m / 100;
  const y = cmyk.y / 100;
  const k = cmyk.k / 100;

  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: cmyk.a,
  };
}

export function cmykToHsl(cmyk: CMYKColor): HSLColor {
  const rgb = cmykToRgb(cmyk);
  return rgbToHsl(rgb);
}

export function cmykToHsv(cmyk: CMYKColor): HSVColor {
  const rgb = cmykToRgb(cmyk);
  return rgbToHsv(rgb);
}

// XYZ CONVERSIONS

export function xyzToRgb(xyz: XYZColor): RGBColor {
  const x = xyz.x / 100;
  const y = xyz.y / 100;
  const z = xyz.z / 100;

  // Convert XYZ to linear RGB using sRGB matrix
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  // Apply gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.round(clamp(r * 255, 0, 255)),
    g: Math.round(clamp(g * 255, 0, 255)),
    b: Math.round(clamp(b * 255, 0, 255)),
    a: xyz.alpha || 1,
  };
}

export function xyzToLab(xyz: XYZColor): LABColor {
  const xr = xyz.x / D65_WHITE.x / 100;
  const yr = xyz.y / D65_WHITE.y / 100;
  const zr = xyz.z / D65_WHITE.z / 100;

  const fx = xr > EPSILON ? Math.cbrt(xr) : (KAPPA * xr + 16) / 116;
  const fy = yr > EPSILON ? Math.cbrt(yr) : (KAPPA * yr + 16) / 116;
  const fz = zr > EPSILON ? Math.cbrt(zr) : (KAPPA * zr + 16) / 116;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return {
    l: clamp(l, 0, 100),
    a,
    b,
    alpha: xyz.alpha,
  };
}

// LAB CONVERSIONS

export function labToXyz(lab: LABColor): XYZColor {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const xr = fx * fx * fx > EPSILON ? fx * fx * fx : (116 * fx - 16) / KAPPA;
  const yr =
    lab.l > KAPPA * EPSILON ? Math.pow((lab.l + 16) / 116, 3) : lab.l / KAPPA;
  const zr = fz * fz * fz > EPSILON ? fz * fz * fz : (116 * fz - 16) / KAPPA;

  return {
    x: xr * D65_WHITE.x * 100,
    y: yr * D65_WHITE.y * 100,
    z: zr * D65_WHITE.z * 100,
    alpha: lab.alpha,
  };
}

export function labToRgb(lab: LABColor): RGBColor {
  const xyz = labToXyz(lab);
  return xyzToRgb(xyz);
}

export function labToLch(lab: LABColor): LCHColor {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

  if (h < 0) {
    h += 360;
  }

  return {
    l: lab.l,
    c,
    h,
    alpha: lab.alpha,
  };
}

// LCH CONVERSIONS

export function lchToLab(lch: LCHColor): LABColor {
  const h = (lch.h * Math.PI) / 180;
  const a = lch.c * Math.cos(h);
  const b = lch.c * Math.sin(h);

  return {
    l: lch.l,
    a,
    b,
    alpha: lch.alpha,
  };
}

export function lchToRgb(lch: LCHColor): RGBColor {
  const lab = lchToLab(lch);
  return labToRgb(lab);
}

export function lchToXyz(lch: LCHColor): XYZColor {
  const lab = lchToLab(lch);
  return labToXyz(lab);
}

// OKLAB CONVERSIONS

export function oklabToRgb(oklab: OKLABColor): RGBColor {
  const l_ = oklab.l + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b;
  const m_ = oklab.l - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b;
  const s_ = oklab.l - 0.0894841775 * oklab.a - 1.291485548 * oklab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Apply gamma correction
  lr = lr > 0.0031308 ? 1.055 * Math.pow(lr, 1 / 2.4) - 0.055 : 12.92 * lr;
  lg = lg > 0.0031308 ? 1.055 * Math.pow(lg, 1 / 2.4) - 0.055 : 12.92 * lg;
  lb = lb > 0.0031308 ? 1.055 * Math.pow(lb, 1 / 2.4) - 0.055 : 12.92 * lb;

  return {
    r: Math.round(clamp(lr * 255, 0, 255)),
    g: Math.round(clamp(lg * 255, 0, 255)),
    b: Math.round(clamp(lb * 255, 0, 255)),
    a: oklab.alpha,
  };
}

export function oklabToOklch(oklab: OKLABColor): OKLCHColor {
  const c = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
  let h = (Math.atan2(oklab.b, oklab.a) * 180) / Math.PI;

  if (h < 0) {
    h += 360;
  }

  return {
    l: oklab.l,
    c,
    h,
    alpha: oklab.alpha,
  };
}

// OKLCH CONVERSIONS

export function oklchToOklab(oklch: OKLCHColor): OKLABColor {
  const h = (oklch.h * Math.PI) / 180;
  const a = oklch.c * Math.cos(h);
  const b = oklch.c * Math.sin(h);

  return {
    l: oklch.l,
    a,
    b,
    alpha: oklch.alpha,
  };
}

export function oklchToRgb(oklch: OKLCHColor): RGBColor {
  const oklab = oklchToOklab(oklch);
  return oklabToRgb(oklab);
}

// UNIVERSAL CONVERTER

/**
 * Convert any color to RGB
 */
export function anyToRgb(
  color:
    | RGBColor
    | HSLColor
    | HSVColor
    | HWBColor
    | CMYKColor
    | LABColor
    | LCHColor
    | OKLABColor
    | OKLCHColor
    | XYZColor
): RGBColor {
  // Check which color space we have based on properties
  if ('r' in color && 'g' in color && 'b' in color) {
    return color as RGBColor;
  }
  if ('h' in color && 's' in color && 'l' in color) {
    return hslToRgb(color as HSLColor);
  }
  if ('h' in color && 's' in color && 'v' in color) {
    return hsvToRgb(color as HSVColor);
  }
  if ('h' in color && 'w' in color && 'b' in color) {
    return hwbToRgb(color as HWBColor);
  }
  if ('c' in color && 'm' in color && 'y' in color && 'k' in color) {
    return cmykToRgb(color as CMYKColor);
  }
  if ('x' in color && 'y' in color && 'z' in color) {
    return xyzToRgb(color as XYZColor);
  }
  if (
    'l' in color &&
    'a' in color &&
    'b' in color &&
    !('c' in color) &&
    !('h' in color)
  ) {
    return labToRgb(color as LABColor);
  }
  if ('l' in color && 'c' in color && 'h' in color) {
    // Could be LCH or OKLCH - we'll treat as LCH by default
    // For better detection, check if values are in OKLCH range
    const lchColor = color as LCHColor;
    if (lchColor.l <= 1) {
      // Likely OKLCH (0-1 range)
      return oklchToRgb(color as OKLCHColor);
    }
    return lchToRgb(lchColor);
  }

  throw new Error('Unknown color format');
}

/**
 * Generic conversion function
 */
export function convertColor(
  color: any,
  targetFormat: string,
  options: ColorConversionOptions = {}
): any {
  const { round = true, precision = 2, preserveAlpha = true } = options;

  // First convert to RGB as intermediate format
  const rgb = anyToRgb(color);

  let result: any;

  switch (targetFormat.toLowerCase()) {
    case 'rgb':
      result = rgb;
      break;
    case 'hsl':
      result = rgbToHsl(rgb);
      break;
    case 'hsv':
      result = rgbToHsv(rgb);
      break;
    case 'hwb':
      result = rgbToHwb(rgb);
      break;
    case 'cmyk':
      result = rgbToCmyk(rgb);
      break;
    case 'xyz':
      result = rgbToXyz(rgb);
      break;
    case 'lab':
      result = rgbToLab(rgb);
      break;
    case 'lch':
      result = rgbToLch(rgb);
      break;
    case 'oklab':
      result = rgbToOklab(rgb);
      break;
    case 'oklch':
      result = rgbToOklch(rgb);
      break;
    default:
      result = rgb;
  }

  // Apply rounding if requested
  if (round && result) {
    Object.keys(result).forEach((key) => {
      if (typeof result[key] === 'number' && key !== 'a' && key !== 'alpha') {
        result[key] = roundToPrecision(result[key], precision);
      }
    });
  }

  // Handle alpha channel
  if (!preserveAlpha) {
    delete result.a;
    delete result.alpha;
  }

  return result;
}

/**
 * Batch convert multiple colors
 */
export function batchConvert(
  colors: any[],
  targetFormat: string,
  options: ColorConversionOptions = {}
): any[] {
  return colors.map((color) => convertColor(color, targetFormat, options));
}

/**
 * Get conversion path between two formats
 */
export function getConversionPath(from: string, to: string): string[] | null {
  const directConversions: Record<string, string[]> = {
    rgb: ['hsl', 'hsv', 'hwb', 'cmyk', 'xyz', 'lab', 'lch', 'oklab', 'oklch'],
    hsl: ['rgb', 'hsv', 'hwb'],
    hsv: ['rgb', 'hsl', 'hwb'],
    hwb: ['rgb', 'hsl', 'hsv'],
    cmyk: ['rgb', 'hsl', 'hsv'],
    xyz: ['rgb', 'lab'],
    lab: ['rgb', 'xyz', 'lch'],
    lch: ['rgb', 'lab', 'xyz'],
    oklab: ['rgb', 'oklch'],
    oklch: ['rgb', 'oklab'],
  };

  from = from.toLowerCase();
  to = to.toLowerCase();

  if (from === to) {
    return [from];
  }

  if (directConversions[from]?.includes(to)) {
    return [from, to];
  }

  // Use RGB as intermediate (most common case)
  if (
    directConversions[from]?.includes('rgb') &&
    directConversions['rgb']?.includes(to)
  ) {
    return [from, 'rgb', to];
  }

  // Use XYZ as intermediate for LAB/LCH conversions
  if (
    ['lab', 'lch'].includes(from) &&
    ['lab', 'lch'].includes(to) &&
    from !== to
  ) {
    return [from, 'xyz', to];
  }

  // Use OKLAB as intermediate for OKLCH
  if (
    ['oklab', 'oklch'].includes(from) &&
    ['oklab', 'oklch'].includes(to) &&
    from !== to
  ) {
    return [from, 'oklab', to];
  }

  // Complex path through RGB
  if (directConversions[from] && directConversions['rgb']?.includes(to)) {
    return [from, 'rgb', to];
  }

  return null;
}

/**
 * Check if direct conversion exists between two formats
 */
export function hasDirectConversion(from: string, to: string): boolean {
  const path = getConversionPath(from, to);
  return path !== null && path.length <= 2;
}

/**
 * Get all supported color formats
 */
export function getSupportedFormats(): string[] {
  return [
    'rgb',
    'hsl',
    'hsv',
    'hwb',
    'cmyk',
    'xyz',
    'lab',
    'lch',
    'oklab',
    'oklch',
  ];
}

/**
 * Validate color format
 */
export function isValidFormat(format: string): boolean {
  return getSupportedFormats().includes(format.toLowerCase());
}
