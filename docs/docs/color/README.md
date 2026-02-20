# Color Management System Documentation

Complete documentation for the powerful color management system included in `@awc/utils`.

## Documentation Structure

This documentation is organized into the following sections:

### 📚 Core Documentation

1. **[Introduction](./index.md)** - Overview and features
2. **[Getting Started](./getting-started.md)** - Quick start guide
3. **[Color Formats](./formats.md)** - All supported color spaces explained
4. **[Examples](./examples.md)** - Real-world usage examples
5. **[API Reference](./api-reference.md)** - Complete API documentation

## Quick Links

- [Installation & Basic Usage](./getting-started.md#installation)
- [Converting Colors](./getting-started.md#converting-colors)
- [Color Manipulation](./getting-started.md#basic-manipulation)
- [OKLCH Format (Recommended)](./formats.md#oklch-best-for-gradients)
- [Accessibility Features](./getting-started.md#accessible-text-colors)
- [Real-World Examples](./examples.md)

## What's Included

The color management system provides:

- ✅ **10+ Color Formats** - RGB, HSL, HSV, HWB, CMYK, LAB, LCH, OKLAB, OKLCH, XYZ
- ✅ **Complete Conversions** - Convert between any supported format
- ✅ **Color Manipulation** - Lighten, darken, saturate, rotate hue, and more
- ✅ **Color Harmonies** - Generate complementary, triadic, analogous schemes
- ✅ **Accessibility** - WCAG contrast checking and automatic contrast colors
- ✅ **Advanced Features** - Gradients, temperature adjustment, color blindness simulation
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Zero Dependencies** - Lightweight and fast

## Quick Example

```typescript
import { Color } from '@awc/utils/color';

// Create and manipulate colors
const color = new Color('#3498db');
const lighter = color.clone().lighten(20);
const darker = color.clone().darken(20);

// Convert to any format
color.toHex();      // '#3498db'
color.toRgb();      // 'rgb(52 152 219)'
color.toOklch();    // 'oklch(0.6319 0.1237 237.08)'

// Generate color schemes
const complementary = color.getHarmony({ type: 'complementary' });
const triadic = color.getHarmony({ type: 'triadic' });

// Check accessibility
const ratio = color.getContrastRatio('#ffffff');
const accessibleText = color.getContrastColor({ targetRatio: 4.5 });
```

## Browser & Node.js Support

- Chrome/Edge 88+
- Firefox 96+
- Safari 15+
- Node.js 14+

## Contributing

Found an issue or have a suggestion? Please contribute!

## License

MIT License - see the main project LICENSE file for details.

---

**Start Reading:** Begin with the [Introduction](./index.md) or jump straight to [Getting Started](./getting-started.md).