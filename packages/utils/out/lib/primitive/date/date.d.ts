import { DateConfig, FormatOptions, Month, DateUnit, DateDifference, ValidationOptions, ValidationResult, TimezoneInfo, DateParseOptions } from './types.js';
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
export declare function configureDateUtils(newConfig: Partial<DateConfig>): void;
/**
 * Reset configuration to defaults
 * @function resetDateConfig
 * @returns {void}
 * @example
 * resetDateConfig(); // Reset all settings to defaults
 */
export declare function resetDateConfig(): void;
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
export declare function parseDate(input: Date | string | number, options?: DateParseOptions): Date;
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
export declare function isDate(date: unknown): date is Date;
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
export declare function formatDate(date: Date | string | number, options?: FormatOptions): string;
/**
 * Get current date and time
 * @function now
 * @returns {Date} Current date and time
 * @example
 * const current = now(); // Returns current Date object
 */
export declare function now(): Date;
/**
 * Get today's date at midnight (00:00:00.000)
 * @function today
 * @returns {Date} Today's date at midnight
 * @example
 * const todayDate = today(); // Returns today at midnight
 */
export declare function today(): Date;
/**
 * Get tomorrow's date at midnight
 * @function tomorrow
 * @returns {Date} Tomorrow's date at midnight
 * @example
 * const tomorrowDate = tomorrow(); // Returns tomorrow at midnight
 */
export declare function tomorrow(): Date;
/**
 * Get yesterday's date at midnight
 * @function yesterday
 * @returns {Date} Yesterday's date at midnight
 * @example
 * const yesterdayDate = yesterday(); // Returns yesterday at midnight
 */
export declare function yesterday(): Date;
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
export declare function createDate(year: number, month: Month, day: number, hour?: number, minute?: number, second?: number, millisecond?: number): Date;
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
export declare function add(date: Date | string | number, amount: number, unit?: DateUnit): Date;
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
export declare function subtract(date: Date | string | number, amount: number, unit?: DateUnit): Date;
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
export declare function addDays(date: Date | string | number, days: number): Date;
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
export declare function subtractDays(date: Date | string | number, days: number): Date;
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
export declare function addMonths(date: Date | string | number, months: number): Date;
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
export declare function subtractMonths(date: Date | string | number, months: number): Date;
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
export declare function addYears(date: Date | string | number, years: number): Date;
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
export declare function subtractYears(date: Date | string | number, years: number): Date;
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
export declare function startOf(date: Date | string | number, unit: DateUnit): Date;
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
export declare function endOf(date: Date | string | number, unit: DateUnit): Date;
/**
 * Get start of day (midnight)
 * @function startOfDay
 * @param {Date | string | number} date - Base date
 * @returns {Date} Date at 00:00:00.000
 * @example
 * startOfDay(new Date()); // Returns today at midnight
 */
export declare function startOfDay(date: Date | string | number): Date;
/**
 * Get end of day (last millisecond)
 * @function endOfDay
 * @param {Date | string | number} date - Base date
 * @returns {Date} Date at 23:59:59.999
 * @example
 * endOfDay(new Date()); // Returns today at 23:59:59.999
 */
export declare function endOfDay(date: Date | string | number): Date;
/**
 * Get start of month
 * @function startOfMonth
 * @param {Date | string | number} date - Base date
 * @returns {Date} First day of month at 00:00:00.000
 * @example
 * startOfMonth(new Date()); // Returns first day of current month
 */
export declare function startOfMonth(date: Date | string | number): Date;
/**
 * Get end of month
 * @function endOfMonth
 * @param {Date | string | number} date - Base date
 * @returns {Date} Last day of month at 23:59:59.999
 * @example
 * endOfMonth(new Date()); // Returns last day of current month at 23:59:59.999
 */
export declare function endOfMonth(date: Date | string | number): Date;
/**
 * Get start of year
 * @function startOfYear
 * @param {Date | string | number} date - Base date
 * @returns {Date} January 1st at 00:00:00.000
 * @example
 * startOfYear(new Date()); // Returns January 1st of current year
 */
export declare function startOfYear(date: Date | string | number): Date;
/**
 * Get end of year
 * @function endOfYear
 * @param {Date | string | number} date - Base date
 * @returns {Date} December 31st at 23:59:59.999
 * @example
 * endOfYear(new Date()); // Returns December 31st of current year at 23:59:59.999
 */
export declare function endOfYear(date: Date | string | number): Date;
/**
 * Get start of week
 * @function startOfWeek
 * @param {Date | string | number} date - Base date
 * @returns {Date} Start of week (configurable via weekStartsOn) at 00:00:00.000
 * @example
 * // With weekStartsOn = 0 (Sunday)
 * startOfWeek(new Date('2024-01-15')); // Returns Sunday, January 14, 2024
 */
export declare function startOfWeek(date: Date | string | number): Date;
/**
 * Get end of week
 * @function endOfWeek
 * @param {Date | string | number} date - Base date
 * @returns {Date} End of week (configurable via weekStartsOn) at 23:59:59.999
 * @example
 * // With weekStartsOn = 0 (Sunday)
 * endOfWeek(new Date('2024-01-15')); // Returns Saturday, January 20, 2024
 */
export declare function endOfWeek(date: Date | string | number): Date;
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
export declare function isBetween(date: Date | string | number, start: Date | string | number, end: Date | string | number, inclusive?: boolean): boolean;
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
export declare function isBefore(date: Date | string | number, compareTo: Date | string | number): boolean;
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
export declare function isAfter(date: Date | string | number, compareTo: Date | string | number): boolean;
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
export declare function isSame(date1: Date | string | number, date2: Date | string | number, unit?: DateUnit): boolean;
/**
 * Check if a date is today
 * @function isToday
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is today
 * @example
 * isToday(new Date()); // true
 * isToday('2024-01-15'); // depends on current date
 */
export declare function isToday(date: Date | string | number): boolean;
/**
 * Check if a date is in the past
 * @function isPast
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is before now
 * @example
 * isPast('2020-01-01'); // true
 * isPast('2030-01-01'); // false
 */
export declare function isPast(date: Date | string | number): boolean;
/**
 * Check if a date is in the future
 * @function isFuture
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is after now
 * @example
 * isFuture('2030-01-01'); // true
 * isFuture('2020-01-01'); // false
 */
export declare function isFuture(date: Date | string | number): boolean;
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
export declare function difference(date1: Date | string | number, date2: Date | string | number): DateDifference;
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
export declare function humanizeDifference(date1: Date | string | number, date2?: Date | string | number, detailed?: boolean): string;
/**
 * Check if a date falls on a weekend
 * @function isWeekend
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is Saturday or Sunday
 * @example
 * isWeekend('2024-01-15'); // false (Monday)
 * isWeekend('2024-01-20'); // true (Saturday)
 */
export declare function isWeekend(date: Date | string | number): boolean;
/**
 * Check if a date falls on a weekday
 * @function isWeekday
 * @param {Date | string | number} date - Date to check
 * @returns {boolean} True if date is Monday through Friday
 * @example
 * isWeekday('2024-01-15'); // true (Monday)
 * isWeekday('2024-01-20'); // false (Saturday)
 */
export declare function isWeekday(date: Date | string | number): boolean;
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
export declare function isBusinessDay(date: Date | string | number): boolean;
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
export declare function addBusinessDays(date: Date | string | number, days: number): Date;
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
export declare function daysBetween(start: Date | string | number, end: Date | string | number, inclusive?: boolean): number;
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
export declare function monthsBetween(start: Date | string | number, end: Date | string | number): number;
/**
 * Calculate number of years between two dates
 * @function yearsBetween
 * @param {Date | string | number} start - Start date
 * @param {Date | string | number} end - End date
 * @returns {number} Number of years between dates
 * @example
 * yearsBetween('2020-06-15', '2024-01-15'); // 4
 */
export declare function yearsBetween(start: Date | string | number, end: Date | string | number): number;
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
export declare function getAge(birthDate: Date | string | number, asOfDate?: Date | string | number): number;
/**
 * Get ISO week number of year
 * @function getWeekNumber
 * @param {Date | string | number} date - Date to check
 * @returns {number} Week number (1-53)
 * @example
 * getWeekNumber('2024-01-01'); // 1
 * getWeekNumber('2024-01-15'); // 3
 */
export declare function getWeekNumber(date: Date | string | number): number;
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
export declare function getQuarter(date: Date | string | number): number;
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
export declare function getDayName(date: Date | string | number, format?: 'full' | 'short'): string;
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
export declare function getMonthName(date: Date | string | number, format?: 'full' | 'short'): string;
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
export declare function getDaysInMonth(date: Date | string | number): number;
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
export declare function isLeapYear(year: number): boolean;
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
export declare function validateDate(date: Date | string | number, options?: ValidationOptions): ValidationResult;
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
export declare function getTimezoneInfo(date: Date | string | number): TimezoneInfo;
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
export declare function convertTimezone(date: Date | string | number, targetTimezone: string): Date;
//# sourceMappingURL=date.d.ts.map