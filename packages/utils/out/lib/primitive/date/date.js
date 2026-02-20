// Constants
const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const MONTHS_IN_YEAR = 12;
const QUARTERS_IN_YEAR = 4;
const WEEKDAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];
const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const MONTH_NAMES_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
// Default configuration
const DEFAULT_CONFIG = {
    defaultTimezone: 'UTC',
    defaultLocale: 'en-US',
    weekStartsOn: 0, // Sunday
    businessDays: {
        businessDays: [1, 2, 3, 4, 5], // Monday to Friday
        holidays: [],
        holidayCheck: () => false,
        workStartHour: 9,
        workEndHour: 17,
    },
};
let config = { ...DEFAULT_CONFIG };
/**
 * Configure date utility settings globally
 * @function configureDateUtils
 * @param {Partial<DateConfig>} newConfig - New configuration options
 * @returns {void}
 * @example
 * // Configure with French locale and week starting on Monday
 * configureDateUtils({
 *   defaultLocale: 'fr-FR',
 *   weekStartsOn: 1,
 * });
 */
export function configureDateUtils(newConfig) {
    config = {
        ...config,
        ...newConfig,
        businessDays: {
            ...config.businessDays,
            ...(newConfig.businessDays || {}),
        },
    };
}
/**
 * Reset configuration to defaults
 * @function resetDateConfig
 * @returns {void}
 * @example
 * resetDateConfig(); // Reset all settings to defaults
 */
export function resetDateConfig() {
    config = { ...DEFAULT_CONFIG };
}
/**
 * Parse a date from various input types with flexible formatting options
 * @function parseDate
 * @param {Date | string | number} input - Date to parse (Date object, string, or timestamp)
 * @param {ParseOptions} [options={}] - Parsing options
 * @returns {Date} Parsed Date object
 * @throws {Error} If date cannot be parsed and strict mode is enabled
 * @example
 * // Parse ISO date
 * parseDate('2024-01-15T10:30:00Z');
 *
 * // Parse US date
 * parseDate('01/15/2024', { format: 'US' });
 *
 * // Parse with custom format
 * parseDate('2024-15-01', { format: 'CUSTOM', customFormat: 'YYYY-DD-MM' });
 */
export function parseDate(input, options = {}) {
    const { format = 'ISO', customFormat = '', timezone = config.defaultTimezone, strict = true, locale = config.defaultLocale, } = options;
    // If already a valid Date, return it
    if (input instanceof Date && isDate(input)) {
        return input;
    }
    let parsedDate = null;
    // Handle number input (timestamp)
    if (typeof input === 'number') {
        parsedDate = new Date(input);
        if (!isDate(parsedDate)) {
            throw new Error(`Invalid timestamp: ${input}`);
        }
        return applyTimezone(parsedDate, timezone);
    }
    // Handle string input
    if (typeof input !== 'string') {
        throw new Error(`Invalid input type: ${typeof input}`);
    }
    const trimmedInput = input.trim();
    if (!trimmedInput) {
        throw new Error('Empty date string');
    }
    try {
        switch (format) {
            case 'ISO':
            case 'ISO_DATE':
            case 'ISO_TIME':
                parsedDate = parseISODate(trimmedInput, format);
                break;
            case 'US':
                parsedDate = parseUSDate(trimmedInput);
                break;
            case 'EU':
                parsedDate = parseEUDate(trimmedInput);
                break;
            case 'CUSTOM':
                parsedDate = parseCustomDate(trimmedInput, customFormat);
                break;
            case 'RFC_2822':
                parsedDate = parseRFC2822Date(trimmedInput);
                break;
            case 'TIMESTAMP':
                parsedDate = parseTimestamp(trimmedInput);
                break;
            default:
                // Try locale-aware parsing as fallback
                parsedDate = parseLocaleDate(trimmedInput, locale, strict);
        }
        if (!parsedDate || !isDate(parsedDate)) {
            if (strict) {
                throw new Error(`Parsing resulted in invalid date from input: "${trimmedInput}"`);
            }
            // In non-strict mode, try generic parsing
            parsedDate = new Date(trimmedInput);
            if (!isDate(parsedDate)) {
                throw new Error(`Invalid date format: ${trimmedInput}`);
            }
        }
        // Apply timezone if specified
        if (timezone && timezone !== 'UTC') {
            parsedDate = convertTimezone(parsedDate, timezone);
        }
        if (!parsedDate) {
            throw new Error(`Invalid date format: ${trimmedInput}`);
        }
        return parsedDate;
    }
    catch (error) {
        if (strict) {
            throw new Error(`Failed to parse date "${trimmedInput}" with format ${format}: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Fallback to Date constructor in non-strict mode
        const fallbackDate = new Date(trimmedInput);
        if (isDate(fallbackDate)) {
            const t = applyTimezone(fallbackDate, timezone);
            if (!t) {
                throw new Error(`Invalid date format: ${trimmedInput}`);
            }
            return t;
        }
        throw new Error(`Invalid date format: ${trimmedInput}`);
    }
}
// ============================================================================
// Fixed Internal Helper Functions
// ============================================================================
/**
 * Parse ISO date string
 * @private
 * @param {string} input - ISO date string
 * @param {DateFormat} format - ISO format type
 * @returns {Date} Parsed date
 */
function parseISODate(input, format) {
    try {
        if (format === 'ISO_DATE') {
            // ISO date without time: YYYY-MM-DD
            // Ensure we have a complete date
            const parts = input.split('-').map((part) => parseInt(part, 10));
            if (parts.length < 3 || parts.some(isNaN)) {
                throw new Error('Invalid ISO date format');
            }
            // Create date at midnight UTC
            const [year, month, day] = parts;
            return new Date(Date.UTC(year, month - 1, day));
        }
        if (format === 'ISO_TIME') {
            // ISO time only: HH:MM:SS.mmm
            const today = new Date();
            const datePart = today.toISOString().split('T')[0];
            return new Date(`${datePart}T${input}Z`);
        }
        // Full ISO format
        const date = new Date(input);
        if (!isDate(date)) {
            throw new Error('Invalid ISO date');
        }
        return date;
    }
    catch {
        throw new Error(`Invalid ISO ${format} format: ${input}`);
    }
}
/**
 * Parse US date string (MM/DD/YYYY or MM/DD/YY)
 * @private
 * @param {string} input - US date string
 * @returns {Date} Parsed date
 */
function parseUSDate(input) {
    try {
        // Handle various US date formats: MM/DD/YYYY, MM/DD/YY, M/D/YYYY, etc.
        const parts = input.split('/');
        if (parts.length !== 3) {
            throw new Error('Invalid US date format - expected MM/DD/YYYY');
        }
        let month = parseInt(parts[0], 10) - 1; // Convert to 0-based
        let day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (isNaN(month) || isNaN(day) || isNaN(year)) {
            throw new Error('Invalid US date format - non-numeric parts');
        }
        // Handle 2-digit years
        if (year < 100) {
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            year += year < 50 ? century : century - 100;
        }
        // Validate date parts
        if (month < 0 || month > 11) {
            throw new Error(`Month must be between 1 and 12, got ${month + 1}`);
        }
        const date = new Date(year, month, day);
        if (!isDate(date)) {
            throw new Error('Invalid date');
        }
        // Check if parsed date matches input (handles invalid dates like February 30)
        if (date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day) {
            throw new Error('Invalid date');
        }
        return date;
    }
    catch (error) {
        throw new Error(`Invalid US date format: ${input} - ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Parse EU date string (DD/MM/YYYY or DD/MM/YY)
 * @private
 * @param {string} input - EU date string
 * @returns {Date} Parsed date
 */
function parseEUDate(input) {
    try {
        // Handle various EU date formats: DD/MM/YYYY, DD/MM/YY, D/M/YYYY, etc.
        const parts = input.split('/');
        if (parts.length !== 3) {
            throw new Error('Invalid EU date format - expected DD/MM/YYYY');
        }
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1; // Convert to 0-based
        let year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            throw new Error('Invalid EU date format - non-numeric parts');
        }
        // Handle 2-digit years
        if (year < 100) {
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            year += year < 50 ? century : century - 100;
        }
        // Validate date parts
        if (month < 0 || month > 11) {
            throw new Error(`Month must be between 1 and 12, got ${month + 1}`);
        }
        const date = new Date(year, month, day);
        if (!isDate(date)) {
            throw new Error('Invalid date');
        }
        // Check if parsed date matches input
        if (date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day) {
            throw new Error('Invalid date');
        }
        return date;
    }
    catch (error) {
        throw new Error(`Invalid EU date format: ${input} - ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Parse date with custom format string
 * @private
 * @param {string} input - Date string
 * @param {string} format - Custom format string
 * @returns {Date} Parsed date
 */
function parseCustomDate(input, format) {
    try {
        if (!format) {
            throw new Error('Custom format string is required');
        }
        // Simple custom format parsing
        // Supported tokens: YYYY, YY, MM, M, DD, D, HH, H, hh, h, mm, m, ss, s
        const formatPattern = format
            .replace(/YYYY/g, '(\\d{4})')
            .replace(/YY/g, '(\\d{2})')
            .replace(/MM/g, '(\\d{2})')
            .replace(/M/g, '(\\d{1,2})')
            .replace(/DD/g, '(\\d{2})')
            .replace(/D/g, '(\\d{1,2})')
            .replace(/HH/g, '(\\d{2})')
            .replace(/H/g, '(\\d{1,2})')
            .replace(/hh/g, '(\\d{2})')
            .replace(/h/g, '(\\d{1,2})')
            .replace(/mm/g, '(\\d{2})')
            .replace(/m/g, '(\\d{1,2})')
            .replace(/ss/g, '(\\d{2})')
            .replace(/s/g, '(\\d{1,2})');
        const regex = new RegExp(`^${formatPattern}$`);
        const match = input.match(regex);
        if (!match) {
            throw new Error(`Input does not match custom format: ${format}`);
        }
        // Extract values based on format
        let year = 0, month = 0, day = 1, hour = 0, minute = 0, second = 0;
        let matchIndex = 1;
        const formatTokens = format.match(/YYYY|YY|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s/g) || [];
        for (const token of formatTokens) {
            const value = parseInt(match[matchIndex], 10);
            if (isNaN(value)) {
                throw new Error(`Invalid numeric value for token ${token}`);
            }
            switch (token) {
                case 'YYYY':
                    year = value;
                    break;
                case 'YY':
                    year = value;
                    // Handle 2-digit years
                    if (year < 100) {
                        const currentYear = new Date().getFullYear();
                        const century = Math.floor(currentYear / 100) * 100;
                        year += year < 50 ? century : century - 100;
                    }
                    break;
                case 'MM':
                case 'M':
                    month = value - 1; // Convert to 0-based
                    break;
                case 'DD':
                case 'D':
                    day = value;
                    break;
                case 'HH':
                case 'H':
                    hour = value;
                    break;
                case 'hh':
                case 'h':
                    hour = value;
                    // Handle 12-hour format (needs AM/PM indicator - not implemented)
                    break;
                case 'mm':
                case 'm':
                    minute = value;
                    break;
                case 'ss':
                case 's':
                    second = value;
                    break;
            }
            matchIndex++;
        }
        // Validate date parts
        if (year < 1000 || year > 9999) {
            throw new Error(`Year must be between 1000 and 9999: ${year}`);
        }
        if (month < 0 || month > 11) {
            throw new Error(`Month must be between 1 and 12: ${month + 1}`);
        }
        const date = new Date(year, month, day, hour, minute, second);
        if (!isDate(date)) {
            throw new Error('Invalid date');
        }
        // Check if parsed date matches input
        if (date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day) {
            throw new Error('Invalid date');
        }
        return date;
    }
    catch (error) {
        throw new Error(`Failed to parse with custom format "${format}": ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Parse RFC 2822 date string
 * @private
 * @param {string} input - RFC 2822 date string
 * @returns {Date} Parsed date
 */
function parseRFC2822Date(input) {
    try {
        const date = new Date(input);
        if (!isDate(date)) {
            throw new Error('Invalid RFC 2822 date');
        }
        return date;
    }
    catch {
        throw new Error(`Invalid RFC 2822 date format: ${input}`);
    }
}
/**
 * Parse timestamp string (YYYYMMDDHHMMSS or YYYYMMDD)
 * @private
 * @param {string} input - Timestamp string
 * @returns {Date} Parsed date
 */
function parseTimestamp(input) {
    try {
        // Handle YYYYMMDDHHMMSS or YYYYMMDD
        if (!/^\d{8}(\d{6})?$/.test(input)) {
            throw new Error('Invalid timestamp format - expected YYYYMMDD or YYYYMMDDHHMMSS');
        }
        const year = parseInt(input.substring(0, 4), 10);
        const month = parseInt(input.substring(4, 6), 10) - 1;
        const day = parseInt(input.substring(6, 8), 10);
        let hour = 0, minute = 0, second = 0;
        if (input.length === 14) {
            hour = parseInt(input.substring(8, 10), 10);
            minute = parseInt(input.substring(10, 12), 10);
            second = parseInt(input.substring(12, 14), 10);
        }
        // Validate date parts
        if (month < 0 || month > 11) {
            throw new Error(`Month must be between 1 and 12: ${month + 1}`);
        }
        const date = new Date(year, month, day, hour, minute, second);
        if (!isDate(date)) {
            throw new Error('Invalid timestamp');
        }
        return date;
    }
    catch (error) {
        throw new Error(`Invalid timestamp format: ${input} - ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Parse date using locale-specific formatting
 * @private
 * @param {string} input - Date string
 * @param {string} locale - Locale to use for parsing
 * @param {boolean} strict - Whether to throw errors
 * @returns {Date} Parsed date
 */
function parseLocaleDate(input, locale, strict) {
    try {
        // Try to parse with Date constructor first (handles many common formats)
        const date = new Date(input);
        if (isDate(date)) {
            return date;
        }
        // Try using Intl.DateTimeFormat for locale-aware parsing
        const formatter = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        });
        // This is a simplification - in practice, you'd need a proper parser
        // For now, fall back to Date constructor
        const fallback = new Date(input);
        if (isDate(fallback)) {
            return fallback;
        }
        if (strict) {
            throw new Error(`Could not parse date with locale ${locale}`);
        }
        return new Date(NaN); // Return invalid date
    }
    catch (error) {
        if (strict) {
            throw new Error(`Failed to parse locale date: ${error instanceof Error ? error.message : String(error)}`);
        }
        return new Date(NaN);
    }
}
/**
 * Apply timezone to a date
 * @private
 * @param {Date} date - Date to adjust
 * @param {string} timezone - Target timezone
 * @returns {Date} Date with timezone applied
 */
function applyTimezone(date, timezone) {
    if (!timezone || timezone === 'UTC') {
        return date;
    }
    // For now, return the date as-is
    // In a production environment, you'd use a library like date-fns-tz or moment-timezone
    return date;
}
/**
 * Validate if a value is a valid Date object
 * @function isDate
 * @param {unknown} date - Value to validate
 * @returns {date is Date} True if value is a valid Date object
 * @example
 * isDate(new Date()); // true
 * isDate('invalid'); // false
 * isDate(new Date('invalid')); // false
 */
export function isDate(date) {
    // More robust validation that doesn't rely solely on instanceof
    if (!date || typeof date !== 'object') {
        return false;
    }
    // Check if it has Date-like properties
    const d = date;
    if (typeof d.getTime !== 'function' || typeof d.getFullYear !== 'function') {
        return false;
    }
    // Check if the internal time value is valid
    const time = d.getTime();
    return !isNaN(time) && typeof time === 'number' && isFinite(time);
}
/**
 * Format a date to string with various formatting options
 * @function formatDate
 * @param {Date | string | number} date - Date to format
 * @param {FormatOptions} [options={}] - Formatting options
 * @returns {string} Formatted date string
 * @example
 * // Format as ISO
 * formatDate(new Date(), { format: 'ISO' });
 *
 * // Format as US date
 * formatDate('2024-01-15', { format: 'US' });
 *
 * // Format with custom format
 * formatDate(new Date(), { format: 'CUSTOM', customFormat: 'YYYY-MM-DD HH:mm:ss' });
 */
export function formatDate(date, options = {}) {
    const parsedDate = parseDate(date);
    const { format = 'ISO', customFormat = '', timezone = config.defaultTimezone, locale = config.defaultLocale, includeTime = true, includeSeconds = false, includeMilliseconds = false, } = options;
    // Convert to target timezone if needed
    let targetDate = parsedDate;
    if (timezone && timezone !== 'UTC') {
        targetDate = convertTimezone(parsedDate, timezone);
    }
    switch (format) {
        case 'ISO':
            return targetDate.toISOString();
        case 'ISO_DATE':
            return targetDate.toISOString().split('T')[0];
        case 'ISO_TIME': {
            const timePart = targetDate.toISOString().split('T')[1];
            return includeMilliseconds ? timePart : timePart.split('.')[0];
        }
        case 'US':
            return formatUSDate(targetDate);
        case 'EU':
            return formatEUDate(targetDate);
        case 'FULL':
            return formatFullDate(targetDate, locale);
        case 'LONG':
            return formatLongDate(targetDate, locale);
        case 'MEDIUM':
            return formatMediumDate(targetDate, locale);
        case 'SHORT':
            return formatShortDate(targetDate, locale);
        case 'TIME':
            return formatTime(targetDate, locale, includeSeconds);
        case 'TIME_24':
            return formatTime24(targetDate, includeSeconds);
        case 'DATETIME':
            return `${formatMediumDate(targetDate, locale)}, ${formatTime(targetDate, locale, includeSeconds)}`;
        case 'TIMESTAMP':
            return formatTimestamp(targetDate);
        case 'RFC_2822':
            return formatRFC2822(targetDate);
        case 'CUSTOM':
            return formatCustomDate(targetDate, customFormat);
        default:
            return targetDate.toISOString();
    }
}
/**
 * Get current date and time
 * @function now
 * @returns {Date} Current date and time
 * @example
 * const current = now(); // Returns current Date object
 */
export function now() {
    return new Date();
}
/**
 * Get today's date at midnight (00:00:00.000)
 * @function today
 * @returns {Date} Today's date at midnight
 * @example
 * const todayDate = today(); // Returns today at midnight
 */
export function today() {
    return startOfDay(new Date());
}
/**
 * Get tomorrow's date at midnight
 * @function tomorrow
 * @returns {Date} Tomorrow's date at midnight
 * @example
 * const tomorrowDate = tomorrow(); // Returns tomorrow at midnight
 */
export function tomorrow() {
    return addDays(today(), 1);
}
/**
 * Get yesterday's date at midnight
 * @function yesterday
 * @returns {Date} Yesterday's date at midnight
 * @example
 * const yesterdayDate = yesterday(); // Returns yesterday at midnight
 */
export function yesterday() {
    return subtractDays(today(), 1);
}
/**
 * Create a date from individual components
 * @function createDate
 * @param {number} year - Year (e.g., 2024)
 * @param {Month} month - Month (0-11, where 0 = January)
 * @param {number} day - Day of month (1-31)
 * @param {number} [hour=0] - Hour (0-23)
 * @param {number} [minute=0] - Minute (0-59)
 * @param {number} [second=0] - Second (0-59)
 * @param {number} [millisecond=0] - Millisecond (0-999)
 * @returns {Date} Created Date object
 * @throws {Error} If any component is out of valid range
 * @example
 * // Create date for January 15, 2024, 10:30:45
 * createDate(2024, 0, 15, 10, 30, 45);
 */
export function createDate(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
    validateDateParts(year, month, day, hour, minute, second, millisecond);
    return new Date(year, month, day, hour, minute, second, millisecond);
}
/**
 * Add time to a date
 * @function add
 * @param {Date | string | number} date - Base date
 * @param {number} amount - Amount to add (can be negative to subtract)
 * @param {DateUnit} [unit='day'] - Unit of time to add
 * @returns {Date} New date after addition
 * @example
 * // Add 5 days
 * add(new Date(), 5, 'day');
 *
 * // Add 2 months
 * add('2024-01-15', 2, 'month');
 *
 * // Subtract 3 hours
 * add(new Date(), -3, 'hour');
 */
export function add(date, amount, unit = 'day') {
    const parsedDate = parseDate(date);
    const result = new Date(parsedDate);
    switch (unit) {
        case 'millisecond':
            result.setMilliseconds(result.getMilliseconds() + amount);
            break;
        case 'second':
            result.setSeconds(result.getSeconds() + amount);
            break;
        case 'minute':
            result.setMinutes(result.getMinutes() + amount);
            break;
        case 'hour':
            result.setHours(result.getHours() + amount);
            break;
        case 'day':
            result.setDate(result.getDate() + amount);
            break;
        case 'week':
            result.setDate(result.getDate() + amount * DAYS_IN_WEEK);
            break;
        case 'month':
            result.setMonth(result.getMonth() + amount);
            break;
        case 'quarter':
            result.setMonth(result.getMonth() + amount * 3);
            break;
        case 'year':
            result.setFullYear(result.getFullYear() + amount);
            break;
        default:
            throw new Error(`Unsupported date unit: ${unit}`);
    }
    return result;
}
/**
 * Subtract time from a date
 * @function subtract
 * @param {Date | string | number} date - Base date
 * @param {number} amount - Amount to subtract (can be negative to add)
 * @param {DateUnit} [unit='day'] - Unit of time to subtract
 * @returns {Date} New date after subtraction
 * @example
 * // Subtract 5 days
 * subtract(new Date(), 5, 'day');
 *
 * // Subtract 2 months
 * subtract('2024-01-15', 2, 'month');
 */
export function subtract(date, amount, unit = 'day') {
    return add(date, -amount, unit);
}
/**
 * Add days to a date
 * @function addDays
 * @param {Date | string | number} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date after adding days
 * @example
 * // Add 5 days
 * addDays(new Date(), 5);
 *
 * // Subtract 3 days
 * addDays('2024-01-15', -3);
 */
export function addDays(date, days) {
    return add(date, days, 'day');
}
/**
 * Subtract days from a date
 * @function subtractDays
 * @param {Date | string | number} date - Base date
 * @param {number} days - Number of days to subtract
 * @returns {Date} New date after subtracting days
 * @example
 * // Subtract 5 days
 * subtractDays(new Date(), 5);
 */
export function subtractDays(date, days) {
    return subtract(date, days, 'day');
}
/**
 * Add months to a date
 * @function addMonths
 * @param {Date | string | number} date - Base date
 * @param {number} months - Number of months to add (can be negative)
 * @returns {Date} New date after adding months
 * @example
 * // Add 2 months
 * addMonths(new Date(), 2);
 *
 * // Subtract 3 months
 * addMonths('2024-01-15', -3);
 */
export function addMonths(date, months) {
    return add(date, months, 'month');
}
/**
 * Subtract months from a date
 * @function subtractMonths
 * @param {Date | string | number} date - Base date
 * @param {number} months - Number of months to subtract
 * @returns {Date} New date after subtracting months
 * @example
 * // Subtract 2 months
 * subtractMonths(new Date(), 2);
 */
export function subtractMonths(date, months) {
    return subtract(date, months, 'month');
}
/**
 * Add years to a date
 * @function addYears
 * @param {Date | string | number} date - Base date
 * @param {number} years - Number of years to add (can be negative)
 * @returns {Date} New date after adding years
 * @example
 * // Add 1 year
 * addYears(new Date(), 1);
 *
 * // Subtract 5 years
 * addYears('2024-01-15', -5);
 */
export function addYears(date, years) {
    return add(date, years, 'year');
}
/**
 * Subtract years from a date
 * @function subtractYears
 * @param {Date | string | number} date - Base date
 * @param {number} years - Number of years to subtract
 * @returns {Date} New date after subtracting years
 * @example
 * // Subtract 10 years
 * subtractYears(new Date(), 10);
 */
export function subtractYears(date, years) {
    return subtract(date, years, 'year');
}
/**
 * Get the start of a time unit
 * @function startOf
 * @param {Date | string | number} date - Base date
 * @param {DateUnit} unit - Time unit to get start of
 * @returns {Date} Date representing the start of the specified unit
 * @example
 * // Start of month
 * startOf(new Date(), 'month');
 *
 * // Start of year
 * startOf('2024-06-15', 'year');
 *
 * // Start of week (configurable via weekStartsOn)
 * startOf(new Date(), 'week');
 */
export function startOf(date, unit) {
    const parsedDate = parseDate(date);
    const result = new Date(parsedDate);
    switch (unit) {
        case 'year':
            result.setMonth(0, 1);
            result.setHours(0, 0, 0, 0);
            break;
        case 'month':
            result.setDate(1);
            result.setHours(0, 0, 0, 0);
            break;
        case 'day':
            result.setHours(0, 0, 0, 0);
            break;
        case 'hour':
            result.setMinutes(0, 0, 0);
            break;
        case 'minute':
            result.setSeconds(0, 0);
            break;
        case 'second':
            result.setMilliseconds(0);
            break;
        case 'week': {
            const dayOfWeek = result.getDay();
            const diff = (dayOfWeek - config.weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK;
            result.setDate(result.getDate() - diff);
            result.setHours(0, 0, 0, 0);
            break;
        }
        case 'quarter': {
            const quarter = Math.floor(result.getMonth() / 3);
            result.setMonth(quarter * 3, 1);
            result.setHours(0, 0, 0, 0);
            break;
        }
        default:
            throw new Error(`Unsupported unit for startOf: ${unit}`);
    }
    return result;
}
/**
 * Get the end of a time unit
 * @function endOf
 * @param {Date | string | number} date - Base date
 * @param {DateUnit} unit - Time unit to get end of
 * @returns {Date} Date representing the end of the specified unit
 * @example
 * // End of month
 * endOf(new Date(), 'month');
 *
 * // End of day (23:59:59.999)
 * endOf('2024-01-15', 'day');
 */
export function endOf(date, unit) {
    const start = startOf(date, unit);
    const result = new Date(start);
    switch (unit) {
        case 'year':
            result.setFullYear(result.getFullYear() + 1);
            break;
        case 'quarter':
            result.setMonth(result.getMonth() + 3);
            break;
        case 'month':
            result.setMonth(result.getMonth() + 1);
            break;
        case 'week':
            result.setDate(result.getDate() + DAYS_IN_WEEK);
            break;
        case 'day':
            result.setDate(result.getDate() + 1);
            break;
        case 'hour':
            result.setHours(result.getHours() + 1);
            break;
        case 'minute':
            result.setMinutes(result.getMinutes() + 1);
            break;
        case 'second':
            result.setSeconds(result.getSeconds() + 1);
            break;
        default:
            throw new Error(`Unsupported unit for endOf: ${unit}`);
    }
    result.setMilliseconds(result.getMilliseconds() - 1);
    return result;
}
/**
 * Get start of day (midnight)
 * @function startOfDay
 * @param {Date | string | number} date - Base date
 * @returns {Date} Date at 00:00:00.000
 * @example
 * startOfDay(new Date()); // Returns today at midnight
 */
export function startOfDay(date) {
    return startOf(date, 'day');
}
/**
 * Get end of day (last millisecond)
 * @function endOfDay
 * @param {Date | string | number} date - Base date
 * @returns {Date} Date at 23:59:59.999
 * @example
 * endOfDay(new Date()); // Returns today at 23:59:59.999
 */
export function endOfDay(date) {
    return endOf(date, 'day');
}
/**
 * Get start of month
 * @function startOfMonth
 * @param {Date | string | number} date - Base date
 * @returns {Date} First day of month at 00:00:00.000
 * @example
 * startOfMonth(new Date()); // Returns first day of current month
 */
export function startOfMonth(date) {
    return startOf(date, 'month');
}
/**
 * Get end of month
 * @function endOfMonth
 * @param {Date | string | number} date - Base date
 * @returns {Date} Last day of month at 23:59:59.999
 * @example
 * endOfMonth(new Date()); // Returns last day of current month at 23:59:59.999
 */
export function endOfMonth(date) {
    return endOf(date, 'month');
}
/**
 * Get start of year
 * @function startOfYear
 * @param {Date | string | number} date - Base date
 * @returns {Date} January 1st at 00:00:00.000
 * @example
 * startOfYear(new Date()); // Returns January 1st of current year
 */
export function startOfYear(date) {
    return startOf(date, 'year');
}
/**
 * Get end of year
 * @function endOfYear
 * @param {Date | string | number} date - Base date
 * @returns {Date} December 31st at 23:59:59.999
 * @example
 * endOfYear(new Date()); // Returns December 31st of current year at 23:59:59.999
 */
export function endOfYear(date) {
    return endOf(date, 'year');
}
/**
 * Get start of week
 * @function startOfWeek
 * @param {Date | string | number} date - Base date
 * @returns {Date} Start of week (configurable via weekStartsOn) at 00:00:00.000
 * @example
 * // With weekStartsOn = 0 (Sunday)
 * startOfWeek(new Date('2024-01-15')); // Returns Sunday, January 14, 2024
 */
export function startOfWeek(date) {
    return startOf(date, 'week');
}
/**
 * Get end of week
 * @function endOfWeek
 * @param {Date | string | number} date - Base date
 * @returns {Date} End of week (configurable via weekStartsOn) at 23:59:59.999
 * @example
 * // With weekStartsOn = 0 (Sunday)
 * endOfWeek(new Date('2024-01-15')); // Returns Saturday, January 20, 2024
 */
export function endOfWeek(date) {
    return endOf(date, 'week');
}
/**
 * Check if a date is between two other dates
 * @function isBetween
 * @param {Date | string | number} date - Date to check
 * @param {Date | string | number} start - Start of range
 * @param {Date | string | number} end - End of range
 * @param {boolean} [inclusive=true] - Whether to include boundaries
 * @returns {boolean} True if date is between start and end
 * @example
 * // Check if date is in January 2024
 * isBetween('2024-01-15', '2024-01-01', '2024-01-31');
 *
 * // Exclusive check
 * isBetween('2024-01-01', '2024-01-01', '2024-01-31', false); // false
 */
export function isBetween(date, start, end, inclusive = true) {
    const parsedDate = parseDate(date);
    const parsedStart = parseDate(start);
    const parsedEnd = parseDate(end);
    if (inclusive) {
        return parsedDate >= parsedStart && parsedDate <= parsedEnd;
    }
    return parsedDate > parsedStart && parsedDate < parsedEnd;
}
/**
 * Check if a date is before another date
 * @function isBefore
 * @param {Date | string | number} date - Date to check
 * @param {Date | string | number} compareTo - Date to compare against
 * @returns {boolean} True if date is before compareTo
 * @example
 * isBefore('2024-01-15', '2024-01-20'); // true
 * isBefore('2024-01-20', '2024-01-15'); // false
 */
export function isBefore(date, compareTo) {
    return parseDate(date) < parseDate(compareTo);
}
/**
 * Check if a date is after another date
 * @function isAfter
 * @param {Date | string | number} date - Date to check
 * @param {Date | string | number} compareTo - Date to compare against
 * @returns {boolean} True if date is after compareTo
 * @example
 * isAfter('2024-01-20', '2024-01-15'); // true
 * isAfter('2024-01-15', '2024-01-20'); // false
 */
export function isAfter(date, compareTo) {
    return parseDate(date) > parseDate(compareTo);
}
/**
 * Check if two dates are the same (optionally by specific unit)
 * @function isSame
 * @param {Date | string | number} date1 - First date
 * @param {Date | string | number} date2 - Second date
 * @param {DateUnit} [unit] - Unit to compare (if not provided, compares exact timestamps)
 * @returns {boolean} True if dates are the same
 * @example
 * // Exact timestamp comparison
 * isSame(new Date('2024-01-15T10:30:00'), new Date('2024-01-15T10:30:00')); // true
 *
 * // Same day comparison
 * isSame('2024-01-15T10:30:00', '2024-01-15T15:45:00', 'day'); // true
 *
 * // Same month comparison
 * isSame('2024-01-15', '2024-01-31', 'month'); // true
 */
export function isSame(date1, date2, unit) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!unit) {
        return d1.getTime() === d2.getTime();
    }
    const start1 = startOf(d1, unit);
    const start2 = startOf(d2, unit);
    return start1.getTime() === start2.getTime();
}
/**
 * Check if a date is today
 * @function isToday
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is today
 * @example
 * isToday(new Date()); // true
 * isToday('2024-01-15'); // depends on current date
 */
export function isToday(date) {
    return isSame(date, today(), 'day');
}
/**
 * Check if a date is in the past
 * @function isPast
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is before now
 * @example
 * isPast('2020-01-01'); // true
 * isPast('2030-01-01'); // false
 */
export function isPast(date) {
    return parseDate(date) < now();
}
/**
 * Check if a date is in the future
 * @function isFuture
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is after now
 * @example
 * isFuture('2030-01-01'); // true
 * isFuture('2020-01-01'); // false
 */
export function isFuture(date) {
    return parseDate(date) > now();
}
/**
 * Calculate the difference between two dates in multiple units
 * @function difference
 * @param {Date | string | number} date1 - First date
 * @param {Date | string | number} date2 - Second date
 * @returns {DateDifference} Object containing differences in various units
 * @example
 * const diff = difference('2024-01-10', '2024-01-15');
 * console.log(diff.days); // 5
 * console.log(diff.totalHours); // 120
 */
export function difference(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    const totalSeconds = Math.floor(diffMs / MILLISECONDS_IN_SECOND);
    const totalMinutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE);
    const totalHours = Math.floor(totalMinutes / MINUTES_IN_HOUR);
    const totalDays = Math.floor(totalHours / HOURS_IN_DAY);
    return {
        years: Math.floor(totalDays / 365),
        months: Math.floor(totalDays / 30),
        weeks: Math.floor(totalDays / DAYS_IN_WEEK),
        days: totalDays,
        hours: totalHours,
        minutes: totalMinutes,
        seconds: totalSeconds,
        milliseconds: diffMs,
        totalDays,
        totalHours,
        totalMinutes,
        totalSeconds,
        totalMilliseconds: diffMs,
    };
}
/**
 * Get human-readable description of date difference
 * @function humanizeDifference
 * @param {Date | string | number} date1 - First date
 * @param {Date | string | number} [date2=now()] - Second date (defaults to now)
 * @param {boolean} [detailed=false] - Whether to use detailed descriptions
 * @returns {string} Human-readable difference
 * @example
 * // Returns something like "2 days ago" or "in 3 hours"
 * humanizeDifference('2024-01-13');
 *
 * // Detailed format
 * humanizeDifference('2024-01-13', new Date(), true); // "2 days ago"
 */
export function humanizeDifference(date1, date2 = now(), detailed = false) {
    const diff = difference(date1, date2);
    const isPast = parseDate(date1) < parseDate(date2);
    const prefix = isPast ? 'ago' : 'in';
    if (diff.years > 0) {
        return detailed
            ? `${diff.years} year${diff.years === 1 ? '' : 's'} ${prefix}`
            : `${diff.years}y ${prefix}`;
    }
    if (diff.months > 0) {
        return detailed
            ? `${diff.months} month${diff.months === 1 ? '' : 's'} ${prefix}`
            : `${diff.months}mo ${prefix}`;
    }
    if (diff.weeks > 0) {
        return detailed
            ? `${diff.weeks} week${diff.weeks === 1 ? '' : 's'} ${prefix}`
            : `${diff.weeks}w ${prefix}`;
    }
    if (diff.days > 0) {
        return detailed
            ? `${diff.days} day${diff.days === 1 ? '' : 's'} ${prefix}`
            : `${diff.days}d ${prefix}`;
    }
    if (diff.hours > 0) {
        return detailed
            ? `${diff.hours} hour${diff.hours === 1 ? '' : 's'} ${prefix}`
            : `${diff.hours}h ${prefix}`;
    }
    if (diff.minutes > 0) {
        return detailed
            ? `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} ${prefix}`
            : `${diff.minutes}m ${prefix}`;
    }
    return detailed
        ? `${diff.seconds} second${diff.seconds === 1 ? '' : 's'} ${prefix}`
        : `${diff.seconds}s ${prefix}`;
}
/**
 * Check if a date falls on a weekend
 * @function isWeekend
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is Saturday or Sunday
 * @example
 * isWeekend('2024-01-15'); // false (Monday)
 * isWeekend('2024-01-20'); // true (Saturday)
 */
export function isWeekend(date) {
    const parsedDate = parseDate(date);
    const day = parsedDate.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
}
/**
 * Check if a date falls on a weekday
 * @function isWeekday
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is Monday through Friday
 * @example
 * isWeekday('2024-01-15'); // true (Monday)
 * isWeekday('2024-01-20'); // false (Saturday)
 */
export function isWeekday(date) {
    return !isWeekend(date);
}
/**
 * Check if a date is a business day (considering weekends and holidays)
 * @function isBusinessDay
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is a business day
 * @example
 * // Assuming Monday-Friday are business days
 * isBusinessDay('2024-01-15'); // true (Monday)
 * isBusinessDay('2024-01-20'); // false (Saturday)
 */
export function isBusinessDay(date) {
    const parsedDate = parseDate(date);
    // Check if it's a weekend
    if (isWeekend(parsedDate)) {
        return false;
    }
    // Check if it's a configured business day
    if (!config.businessDays.businessDays.includes(parsedDate.getDay())) {
        return false;
    }
    // Check if it's a holiday
    const isHoliday = config.businessDays.holidays?.some((holiday) => isSame(holiday, parsedDate, 'day')) || config.businessDays.holidayCheck?.(parsedDate);
    return !isHoliday;
}
/**
 * Add business days to a date (skips weekends and holidays)
 * @function addBusinessDays
 * @param {Date | string | number} date - Base date
 * @param {number} days - Number of business days to add (can be negative)
 * @returns {Date} New date after adding business days
 * @example
 * // Add 3 business days to Friday
 * addBusinessDays('2024-01-12', 3); // Returns Wednesday, January 17
 */
export function addBusinessDays(date, days) {
    let result = parseDate(date);
    let daysAdded = 0;
    const direction = days > 0 ? 1 : -1;
    while (daysAdded < Math.abs(days)) {
        result = addDays(result, direction);
        if (isBusinessDay(result)) {
            daysAdded++;
        }
    }
    return result;
}
/**
 * Calculate number of days between two dates
 * @function daysBetween
 * @param {Date | string | number} start - Start date
 * @param {Date | string | number} end - End date
 * @param {boolean} [inclusive=false] - Whether to include both start and end dates
 * @returns {number} Number of days between dates
 * @example
 * daysBetween('2024-01-10', '2024-01-15'); // 5
 * daysBetween('2024-01-10', '2024-01-15', true); // 6
 */
export function daysBetween(start, end, inclusive = false) {
    const startDate = startOfDay(parseDate(start));
    const endDate = startOfDay(parseDate(end));
    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    const days = Math.floor(diffMs /
        (MILLISECONDS_IN_SECOND *
            SECONDS_IN_MINUTE *
            MINUTES_IN_HOUR *
            HOURS_IN_DAY));
    return inclusive ? days + 1 : days;
}
/**
 * Calculate number of months between two dates
 * @function monthsBetween
 * @param {Date | string | number} start - Start date
 * @param {Date | string | number} end - End date
 * @returns {number} Number of months between dates
 * @example
 * monthsBetween('2024-01-15', '2024-03-15'); // 2
 * monthsBetween('2024-01-31', '2024-02-28'); // 1
 */
export function monthsBetween(start, end) {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthsDiff = endDate.getMonth() - startDate.getMonth();
    return yearsDiff * 12 + monthsDiff;
}
/**
 * Calculate number of years between two dates
 * @function yearsBetween
 * @param {Date | string | number} start - Start date
 * @param {Date | string | number} end - End date
 * @returns {number} Number of years between dates
 * @example
 * yearsBetween('2020-06-15', '2024-01-15'); // 4
 */
export function yearsBetween(start, end) {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    return endDate.getFullYear() - startDate.getFullYear();
}
/**
 * Calculate age from birth date
 * @function getAge
 * @param {Date | string | number} birthDate - Birth date
 * @param {Date | string | number} [asOfDate=now()] - Date to calculate age as of
 * @returns {number} Age in years
 * @example
 * getAge('1990-06-15', '2024-01-15'); // 33
 * getAge('2000-02-29', '2024-02-28'); // 23
 * getAge('2000-02-29', '2024-02-29'); // 24
 */
export function getAge(birthDate, asOfDate = now()) {
    const birth = parseDate(birthDate);
    const asOf = parseDate(asOfDate);
    let age = asOf.getFullYear() - birth.getFullYear();
    const monthDiff = asOf.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
        age--;
    }
    return Math.max(0, age);
}
/**
 * Get ISO week number of year
 * @function getWeekNumber
 * @param {Date | string | number} date - Date to check
 * @returns {number} Week number (1-53)
 * @example
 * getWeekNumber('2024-01-01'); // 1
 * getWeekNumber('2024-01-15'); // 3
 */
export function getWeekNumber(date) {
    const parsedDate = parseDate(date);
    const firstDayOfYear = new Date(parsedDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (parsedDate.getTime() - firstDayOfYear.getTime()) /
        (MILLISECONDS_IN_SECOND *
            SECONDS_IN_MINUTE *
            MINUTES_IN_HOUR *
            HOURS_IN_DAY);
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / DAYS_IN_WEEK);
}
/**
 * Get quarter of year
 * @function getQuarter
 * @param {Date | string | number} date - Date to check
 * @returns {number} Quarter number (1-4)
 * @example
 * getQuarter('2024-01-15'); // 1
 * getQuarter('2024-04-15'); // 2
 * getQuarter('2024-07-15'); // 3
 * getQuarter('2024-10-15'); // 4
 */
export function getQuarter(date) {
    const month = parseDate(date).getMonth();
    return Math.floor(month / 3) + 1;
}
/**
 * Get day name
 * @function getDayName
 * @param {Date | string | number} date - Date to check
 * @param {'full' | 'short'} [format='full'] - Format of day name
 * @returns {string} Day name
 * @example
 * getDayName('2024-01-15'); // "Monday"
 * getDayName('2024-01-15', 'short'); // "Mon"
 */
export function getDayName(date, format = 'full') {
    const parsedDate = parseDate(date);
    const dayIndex = parsedDate.getDay();
    return format === 'full'
        ? WEEKDAY_NAMES[dayIndex]
        : WEEKDAY_NAMES_SHORT[dayIndex];
}
/**
 * Get month name
 * @function getMonthName
 * @param {Date | string | number} date - Date to check
 * @param {'full' | 'short'} [format='full'] - Format of month name
 * @returns {string} Month name
 * @example
 * getMonthName('2024-01-15'); // "January"
 * getMonthName('2024-01-15', 'short'); // "Jan"
 */
export function getMonthName(date, format = 'full') {
    const parsedDate = parseDate(date);
    const monthIndex = parsedDate.getMonth();
    return format === 'full'
        ? MONTH_NAMES[monthIndex]
        : MONTH_NAMES_SHORT[monthIndex];
}
/**
 * Get number of days in month
 * @function getDaysInMonth
 * @param {Date | string | number} date - Date to check
 * @returns {number} Number of days in month
 * @example
 * getDaysInMonth('2024-01-15'); // 31
 * getDaysInMonth('2024-02-15'); // 29 (leap year)
 * getDaysInMonth('2023-02-15'); // 28
 */
export function getDaysInMonth(date) {
    const parsedDate = parseDate(date);
    return new Date(parsedDate.getFullYear(), parsedDate.getMonth() + 1, 0).getDate();
}
/**
 * Check if year is a leap year
 * @function isLeapYear
 * @param {number} year - Year to check
 * @returns {boolean} True if year is a leap year
 * @example
 * isLeapYear(2024); // true
 * isLeapYear(2023); // false
 * isLeapYear(2000); // true (century divisible by 400)
 * isLeapYear(1900); // false (century not divisible by 400)
 */
export function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
/**
 * Validate a date with constraints
 * @function validateDate
 * @param {Date | string | number} date - Date to validate
 * @param {ValidationOptions} [options={}] - Validation options
 * @returns {ValidationResult} Validation result with errors if any
 * @example
 * // Simple validation
 * validateDate('2024-01-15');
 *
 * // With constraints
 * validateDate('2024-01-15', {
 *   min: '2024-01-01',
 *   max: '2024-12-31',
 *   allowPast: false,
 * });
 */
export function validateDate(date, options = {}) {
    const errors = [];
    try {
        const parsedDate = parseDate(date);
        if (options.required && !parsedDate) {
            errors.push('Date is required');
        }
        if (options.min || options.minDate) {
            const minDate = parseDate(options.min || options.minDate);
            if (parsedDate < minDate) {
                errors.push(`Date must be on or after ${formatDate(minDate, {
                    format: 'MEDIUM',
                })}`);
            }
        }
        if (options.max || options.maxDate) {
            const maxDate = parseDate(options.max || options.maxDate);
            if (parsedDate > maxDate) {
                errors.push(`Date must be on or before ${formatDate(maxDate, {
                    format: 'MEDIUM',
                })}`);
            }
        }
        if (options.allowPast === false && isPast(parsedDate)) {
            errors.push('Date must be in the future');
        }
        if (options.allowFuture === false && isFuture(parsedDate)) {
            errors.push('Date must be in the past');
        }
    }
    catch (error) {
        errors.push(error instanceof Error ? error.message : 'Invalid date');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Get timezone information for a date
 * @function getTimezoneInfo
 * @param {Date | string | number} date - Date to get timezone info for
 * @returns {TimezoneInfo} Timezone information
 * @example
 * const info = getTimezoneInfo(new Date());
 * console.log(info.name); // "America/New_York"
 * console.log(info.offsetString); // "UTC-05:00"
 */
export function getTimezoneInfo(date) {
    const parsedDate = parseDate(date);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -parsedDate.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return {
        abbreviation: getTimezoneAbbreviation(parsedDate),
        name: timezone,
        offset,
        offsetString: `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        isDST: isDST(parsedDate),
    };
}
/**
 * Convert date to another timezone
 * @function convertTimezone
 * @param {Date | string | number} date - Date to convert
 * @param {string} targetTimezone - Target timezone (e.g., 'America/New_York', 'UTC')
 * @returns {Date} Date converted to target timezone
 * @example
 * // Convert to UTC
 * convertTimezone(new Date(), 'UTC');
 *
 * // Convert to New York time
 * convertTimezone('2024-01-15T10:30:00Z', 'America/New_York');
 */
export function convertTimezone(date, targetTimezone) {
    const parsedDate = parseDate(date);
    if (targetTimezone === 'UTC') {
        return new Date(parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60000);
    }
    // For other timezones, use Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });
    const parts = formatter.formatToParts(parsedDate);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    return createDate(parseInt(getPart('year')), (parseInt(getPart('month')) - 1), parseInt(getPart('day')), parseInt(getPart('hour')), parseInt(getPart('minute')), parseInt(getPart('second')));
}
// ============================================================================
// Internal Helper Functions
// ============================================================================
// /**
//  * Parse ISO date string
//  * @private
//  * @param {string} input - ISO date string
//  * @param {DateFormat} format - ISO format type
//  * @returns {Date} Parsed date
//  */
// function parseISODate(input: string, format: DateFormat): Date {
//   if (format === 'ISO_DATE') {
//     // Ensure we have a complete date
//     const parts = input.split('-');
//     if (parts.length < 3) {
//       throw new Error('Invalid ISO date format');
//     }
//     return new Date(`${input}T00:00:00.000Z`);
//   }
//   if (format === 'ISO_TIME') {
//     // Parse time only (use today's date)
//     const today = new Date().toISOString().split('T')[0];
//     return new Date(`${today}T${input}Z`);
//   }
//   // Full ISO format
//   return new Date(input);
// }
// /**
//  * Parse US date string (MM/DD/YYYY or MM/DD/YY)
//  * @private
//  * @param {string} input - US date string
//  * @returns {Date} Parsed date
//  */
// function parseUSDate(input: string): Date {
//   // MM/DD/YYYY or MM/DD/YY
//   const parts = input.split('/');
//   if (parts.length !== 3) {
//     throw new Error('Invalid US date format');
//   }
//   let month = parseInt(parts[0]) - 1;
//   let day = parseInt(parts[1]);
//   let year = parseInt(parts[2]);
//   // Handle 2-digit years
//   if (year < 100) {
//     year += year < 50 ? 2000 : 1900;
//   }
//   validateDateParts(year, month as Month, day);
//   return new Date(year, month, day);
// }
// /**
//  * Parse EU date string (DD/MM/YYYY or DD/MM/YY)
//  * @private
//  * @param {string} input - EU date string
//  * @returns {Date} Parsed date
//  */
// function parseEUDate(input: string): Date {
//   // DD/MM/YYYY or DD/MM/YY
//   const parts = input.split('/');
//   if (parts.length !== 3) {
//     throw new Error('Invalid EU date format');
//   }
//   let day = parseInt(parts[0]);
//   let month = parseInt(parts[1]) - 1;
//   let year = parseInt(parts[2]);
//   // Handle 2-digit years
//   if (year < 100) {
//     year += year < 50 ? 2000 : 1900;
//   }
//   validateDateParts(year, month as Month, day);
//   return new Date(year, month, day);
// }
// /**
//  * Parse date with custom format string
//  * @private
//  * @param {string} input - Date string
//  * @param {string} format - Custom format string
//  * @returns {Date} Parsed date
//  */
// function parseCustomDate(input: string, format: string): Date {
//   // Simple custom format parsing
//   const formatChars = format.split('');
//   const inputChars = input.split('');
//   let year = 0,
//     month = 0,
//     day = 0,
//     hour = 0,
//     minute = 0,
//     second = 0;
//   for (let i = 0; i < formatChars.length; i++) {
//     const formatChar = formatChars[i];
//     const inputChar = inputChars[i];
//     switch (formatChar) {
//       case 'Y':
//         year = year * 10 + parseInt(inputChar);
//         break;
//       case 'M':
//         month = month * 10 + parseInt(inputChar);
//         break;
//       case 'D':
//         day = day * 10 + parseInt(inputChar);
//         break;
//       case 'h':
//         hour = hour * 10 + parseInt(inputChar);
//         break;
//       case 'm':
//         minute = minute * 10 + parseInt(inputChar);
//         break;
//       case 's':
//         second = second * 10 + parseInt(inputChar);
//         break;
//       default:
//         // Skip separator characters
//         break;
//     }
//   }
//   // Adjust month (format is 1-based, Date is 0-based)
//   month = Math.max(1, month) - 1;
//   validateDateParts(year, month as Month, day, hour, minute, second);
//   return new Date(year, month, day, hour, minute, second);
// }
// /**
//  * Parse RFC 2822 date string
//  * @private
//  * @param {string} input - RFC 2822 date string
//  * @returns {Date} Parsed date
//  */
// function parseRFC2822Date(input: string): Date {
//   return new Date(input);
// }
// /**
//  * Parse timestamp string (YYYYMMDDHHMMSS)
//  * @private
//  * @param {string} input - Timestamp string
//  * @returns {Date} Parsed date
//  */
// function parseTimestamp(input: string): Date {
//   // YYYYMMDDHHMMSS format
//   if (input.length !== 14) {
//     throw new Error('Invalid timestamp format');
//   }
//   const year = parseInt(input.substring(0, 4));
//   const month = parseInt(input.substring(4, 6)) - 1;
//   const day = parseInt(input.substring(6, 8));
//   const hour = parseInt(input.substring(8, 10));
//   const minute = parseInt(input.substring(10, 12));
//   const second = parseInt(input.substring(12, 14));
//   validateDateParts(year, month as Month, day, hour, minute, second);
//   return new Date(year, month, day, hour, minute, second);
// }
// /**
//  * Parse date using locale-specific formatting
//  * @private
//  * @param {string} input - Date string
//  * @param {string} locale - Locale to use for parsing
//  * @returns {Date} Parsed date
//  */
// function parseLocaleDate(input: string, locale: string): Date {
//   // Try various common formats
//   const formats = [
//     new Intl.DateTimeFormat(locale, { dateStyle: 'short' }),
//     new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
//     new Intl.DateTimeFormat(locale, { dateStyle: 'long' }),
//   ];
//   for (const formatter of formats) {
//     try {
//       // Use Date's built-in parsing for now
//       const date = new Date(input);
//       if (isDate(date)) {
//         return date;
//       }
//     } catch {
//       // Continue to next format
//     }
//   }
//   throw new Error('Could not parse date with locale');
// }
/**
 * Format date as US format (MM/DD/YYYY)
 * @private
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatUSDate(date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}
/**
 * Format date as EU format (DD/MM/YYYY)
 * @private
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatEUDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
/**
 * Format date as full textual format
 * @private
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted date
 */
function formatFullDate(date, locale) {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}
/**
 * Format date as long format
 * @private
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted date
 */
function formatLongDate(date, locale) {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}
/**
 * Format date as medium format
 * @private
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted date
 */
function formatMediumDate(date, locale) {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}
/**
 * Format date as short format
 * @private
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted date
 */
function formatShortDate(date, locale) {
    return new Intl.DateTimeFormat(locale, {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
    }).format(date);
}
/**
 * Format time
 * @private
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting
 * @param {boolean} includeSeconds - Whether to include seconds
 * @returns {string} Formatted time
 */
function formatTime(date, locale, includeSeconds) {
    return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: true,
    }).format(date);
}
/**
 * Format time in 24-hour format
 * @private
 * @param {Date} date - Date to format
 * @param {boolean} includeSeconds - Whether to include seconds
 * @returns {string} Formatted time
 */
function formatTime24(date, includeSeconds) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = includeSeconds
        ? `:${date.getSeconds().toString().padStart(2, '0')}`
        : '';
    return `${hours}:${minutes}${seconds}`;
}
/**
 * Format date as timestamp (YYYYMMDDHHMMSS)
 * @private
 * @param {Date} date - Date to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
/**
 * Format date as RFC 2822 string
 * @private
 * @param {Date} date - Date to format
 * @returns {string} RFC 2822 formatted date
 */
function formatRFC2822(date) {
    return date.toUTCString();
}
/**
 * Format date with custom format string
 * @private
 * @param {Date} date - Date to format
 * @param {string} format - Custom format string
 * @returns {string} Formatted date
 */
function formatCustomDate(date, format) {
    const tokens = {
        YYYY: date.getFullYear().toString(),
        YY: date.getFullYear().toString().slice(-2),
        MMMM: MONTH_NAMES[date.getMonth()],
        MMM: MONTH_NAMES_SHORT[date.getMonth()],
        MM: (date.getMonth() + 1).toString().padStart(2, '0'),
        M: (date.getMonth() + 1).toString(),
        DDDD: WEEKDAY_NAMES[date.getDay()],
        DDD: WEEKDAY_NAMES_SHORT[date.getDay()],
        DD: date.getDate().toString().padStart(2, '0'),
        D: date.getDate().toString(),
        HH: date.getHours().toString().padStart(2, '0'),
        H: date.getHours().toString(),
        hh: (date.getHours() % 12 || 12).toString().padStart(2, '0'),
        h: (date.getHours() % 12 || 12).toString(),
        mm: date.getMinutes().toString().padStart(2, '0'),
        m: date.getMinutes().toString(),
        ss: date.getSeconds().toString().padStart(2, '0'),
        s: date.getSeconds().toString(),
        SSS: date.getMilliseconds().toString().padStart(3, '0'),
        A: date.getHours() < 12 ? 'AM' : 'PM',
        a: date.getHours() < 12 ? 'am' : 'pm',
    };
    return format.replace(/YYYY|YY|MMMM|MMM|MM|M|DDDD|DDD|DD|D|HH|H|hh|h|mm|m|ss|s|SSS|A|a/g, (match) => tokens[match] || match);
}
/**
 * Validate date component values
 * @private
 * @param {number} year - Year
 * @param {Month} month - Month (0-11)
 * @param {number} day - Day of month
 * @param {number} [hour=0] - Hour (0-23)
 * @param {number} [minute=0] - Minute (0-59)
 * @param {number} [second=0] - Second (0-59)
 * @param {number} [millisecond=0] - Millisecond (0-999)
 * @throws {Error} If any component is out of valid range
 */
function validateDateParts(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
    if (year < 1000 || year > 9999) {
        throw new Error(`Year must be between 1000 and 9999: ${year}`);
    }
    if (month < 0 || month > 11) {
        throw new Error(`Month must be between 0 and 11: ${month}`);
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        throw new Error(`Day must be between 1 and ${daysInMonth} for month ${month}: ${day}`);
    }
    if (hour < 0 || hour > 23) {
        throw new Error(`Hour must be between 0 and 23: ${hour}`);
    }
    if (minute < 0 || minute > 59) {
        throw new Error(`Minute must be between 0 and 59: ${minute}`);
    }
    if (second < 0 || second > 59) {
        throw new Error(`Second must be between 0 and 59: ${second}`);
    }
    if (millisecond < 0 || millisecond > 999) {
        throw new Error(`Millisecond must be between 0 and 999: ${millisecond}`);
    }
}
/**
 * Get timezone abbreviation
 * @private
 * @param {Date} date - Date to get timezone for
 * @returns {string} Timezone abbreviation
 */
function getTimezoneAbbreviation(date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const timezonePart = parts.find((part) => part.type === 'timeZoneName');
    return timezonePart ? timezonePart.value : 'UTC';
}
/**
 * Check if Daylight Saving Time is active for a date
 * @private
 * @param {Date} date - Date to check
 * @returns {boolean} True if DST is active
 */
function isDST(date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdTimezoneOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    return date.getTimezoneOffset() < stdTimezoneOffset;
}
