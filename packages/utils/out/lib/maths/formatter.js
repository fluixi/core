/**
 * Formats a number with thousand separators and decimal places
 * @param value - Number to format
 * @param options - Options object with locale, minimumFractionDigits, and maximumFractionDigits
 * Optimized: Uses Intl.NumberFormat for locale-aware formatting
 */
export const formatNumber = (value, options = {}) => {
    const { locale = 'en-US', minimumFractionDigits = 0, maximumFractionDigits = 20 } = options;
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits
    }).format(value);
};
/**
 * Formats a number as currency
 * @param value - Number to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * Optimized: Uses Intl.NumberFormat
 */
export const formatCurrency = (value, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
    }).format(value);
};
/**
 * Formats bytes to human-readable string (KB, MB, GB, etc.)
 * @param bytes - Number of bytes to format
 * @param decimals - Number of decimal places to include (default: 2)
 * Optimized: Logarithmic calculation for units
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
/**
 * Formats a number as a percentage
 * @param value - Number to format
 * @param decimals - Number of decimal places to include (default: 2)
 * @param locale - Locale string (default: 'en-US')
 * Optimized: Single multiplication and formatting
 */
export const formatPercent = (value, decimals = 2, locale = 'en-US') => {
    const percent = value * 100;
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.max(0, decimals),
    }).format(percent / 100);
};
