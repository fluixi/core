/**
 * Formats a number with thousand separators and decimal places
 * @param value - Number to format
 * @param options - Options object with locale, minimumFractionDigits, and maximumFractionDigits
 * Optimized: Uses Intl.NumberFormat for locale-aware formatting
 */
export declare const formatNumber: (value: number, options?: {
    locale?: Intl.LocalesArgument;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}) => string;
/**
 * Formats a number as currency
 * @param value - Number to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * Optimized: Uses Intl.NumberFormat
 */
export declare const formatCurrency: (value: number, currency?: string, locale?: string) => string;
/**
 * Formats bytes to human-readable string (KB, MB, GB, etc.)
 * @param bytes - Number of bytes to format
 * @param decimals - Number of decimal places to include (default: 2)
 * Optimized: Logarithmic calculation for units
 */
export declare const formatBytes: (bytes: number, decimals?: number) => string;
/**
 * Formats a number as a percentage
 * @param value - Number to format
 * @param decimals - Number of decimal places to include (default: 2)
 * @param locale - Locale string (default: 'en-US')
 * Optimized: Single multiplication and formatting
 */
export declare const formatPercent: (value: number, decimals?: number, locale?: string) => string;
//# sourceMappingURL=formatter.d.ts.map