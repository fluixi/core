/**
 * @module DateUtils
 * @description Comprehensive date utility library with TypeScript support
 * @version 1.0.0
 * @license MIT
 */
/**
 * Date format patterns for parsing and formatting
 * @typedef {Object} DateFormat
 * @property {'ISO'} ISO - ISO 8601 format: 2024-01-15T10:30:00.000Z
 * @property {'ISO_DATE'} ISO_DATE - ISO date only: 2024-01-15
 * @property {'ISO_TIME'} ISO_TIME - ISO time only: 10:30:00.000
 * @property {'US'} US - US format: 01/15/2024
 * @property {'EU'} EU - European format: 15/01/2024
 * @property {'FULL'} FULL - Full textual format: Monday, January 15, 2024
 * @property {'LONG'} LONG - Long format: January 15, 2024
 * @property {'MEDIUM'} MEDIUM - Medium format: Jan 15, 2024
 * @property {'SHORT'} SHORT - Short format: 1/15/24
 * @property {'TIME'} TIME - Time format: 10:30 AM
 * @property {'TIME_24'} TIME_24 - 24-hour time format: 10:30
 * @property {'DATETIME'} DATETIME - Date and time: Jan 15, 2024, 10:30 AM
 * @property {'TIMESTAMP'} TIMESTAMP - Timestamp format: 20240115103000
 * @property {'RFC_2822'} RFC_2822 - RFC 2822 format: Mon, 15 Jan 2024 10:30:00 +0000
 * @property {'CUSTOM'} CUSTOM - Custom format string
 */
export type DateFormat = 'ISO' | 'ISO_DATE' | 'ISO_TIME' | 'US' | 'EU' | 'FULL' | 'LONG' | 'MEDIUM' | 'SHORT' | 'TIME' | 'TIME_24' | 'DATETIME' | 'TIMESTAMP' | 'RFC_2822' | 'CUSTOM';
/**
 * Date units for manipulation
 * @typedef {Object} DateUnit
 * @property {'millisecond'} millisecond - Millisecond unit
 * @property {'second'} second - Second unit
 * @property {'minute'} minute - Minute unit
 * @property {'hour'} hour - Hour unit
 * @property {'day'} day - Day unit
 * @property {'week'} week - Week unit
 * @property {'month'} month - Month unit
 * @property {'quarter'} quarter - Quarter unit
 * @property {'year'} year - Year unit
 */
export type DateUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
/**
 * Weekday indices (0 = Sunday, 1 = Monday, etc.)
 * @typedef {number} Weekday
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/**
 * Month indices (0 = January, 11 = December)
 * @typedef {number} Month
 */
export type Month = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
/**
 * Date range with start and end dates
 * @interface DateRange
 * @property {Date} start - Start date
 * @property {Date} end - End date
 */
export interface DateRange {
    start: Date;
    end: Date;
}
/**
 * Result of date difference calculation
 * @interface DateDifference
 * @property {number} years - Difference in years
 * @property {number} months - Difference in months
 * @property {number} weeks - Difference in weeks
 * @property {number} days - Difference in days
 * @property {number} hours - Difference in hours
 * @property {number} minutes - Difference in minutes
 * @property {number} seconds - Difference in seconds
 * @property {number} milliseconds - Difference in milliseconds
 * @property {number} totalDays - Total difference in days
 * @property {number} totalHours - Total difference in hours
 * @property {number} totalMinutes - Total difference in minutes
 * @property {number} totalSeconds - Total difference in seconds
 * @property {number} totalMilliseconds - Total difference in milliseconds
 */
export interface DateDifference {
    years: number;
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
    totalDays: number;
    totalHours: number;
    totalMinutes: number;
    totalSeconds: number;
    totalMilliseconds: number;
}
/**
 * Options for parsing dates
 * @interface DateParseOptions
 * @property {DateFormat} [format='ISO'] - Date format to parse
 * @property {string} [customFormat=''] - Custom format string (used with format='CUSTOM')
 * @property {string} [timezone] - Timezone for parsing
 * @property {boolean} [strict=true] - Whether to throw errors on invalid dates
 * @property {string} [locale='en-US'] - Locale for parsing
 */
export interface DateParseOptions {
    format?: DateFormat;
    customFormat?: string;
    timezone?: string;
    strict?: boolean;
    locale?: string;
}
/**
 * Options for formatting dates
 * @interface FormatOptions
 * @property {DateFormat} [format='ISO'] - Date format to output
 * @property {string} [customFormat=''] - Custom format string (used with format='CUSTOM')
 * @property {string} [timezone] - Timezone for formatting
 * @property {string} [locale='en-US'] - Locale for formatting
 * @property {boolean} [includeTime=true] - Whether to include time in output
 * @property {boolean} [includeSeconds=false] - Whether to include seconds
 * @property {boolean} [includeMilliseconds=false] - Whether to include milliseconds
 */
export interface FormatOptions {
    format?: DateFormat;
    customFormat?: string;
    timezone?: string;
    locale?: string;
    includeTime?: boolean;
    includeSeconds?: boolean;
    includeMilliseconds?: boolean;
}
/**
 * Options for validating dates
 * @interface ValidationOptions
 * @property {Date|string|number} [min] - Minimum allowed date
 * @property {Date|string|number} [max] - Maximum allowed date
 * @property {Date|string|number} [minDate] - Minimum allowed date (alias for min)
 * @property {Date|string|number} [maxDate] - Maximum allowed date (alias for max)
 * @property {boolean} [allowPast=true] - Whether to allow past dates
 * @property {boolean} [allowFuture=true] - Whether to allow future dates
 * @property {boolean} [required=true] - Whether the date is required
 */
export interface ValidationOptions {
    min?: Date | string | number;
    max?: Date | string | number;
    minDate?: Date | string | number;
    maxDate?: Date | string | number;
    allowPast?: boolean;
    allowFuture?: boolean;
    required?: boolean;
}
/**
 * Timezone information
 * @interface TimezoneInfo
 * @property {string} abbreviation - Timezone abbreviation (e.g., 'EST')
 * @property {string} name - Full timezone name
 * @property {number} offset - Timezone offset in minutes from UTC
 * @property {string} offsetString - Timezone offset as string (e.g., 'UTC-05:00')
 * @property {boolean} isDST - Whether Daylight Saving Time is active
 */
export interface TimezoneInfo {
    abbreviation: string;
    name: string;
    offset: number;
    offsetString: string;
    isDST: boolean;
}
/**
 * Business day configuration
 * @interface BusinessDayConfig
 * @property {Weekday[]} businessDays - Array of weekdays considered business days
 * @property {Date[]} [holidays] - Array of holiday dates
 * @property {(date: Date) => boolean} [holidayCheck] - Function to check if date is a holiday
 * @property {number} [workStartHour=9] - Start hour of workday (0-23)
 * @property {number} [workEndHour=17] - End hour of workday (0-23)
 */
export interface BusinessDayConfig {
    businessDays: Weekday[];
    holidays?: Date[];
    holidayCheck?: (date: Date) => boolean;
    workStartHour?: number;
    workEndHour?: number;
}
/**
 * Date utility configuration
 * @interface DateConfig
 * @property {string} [defaultTimezone='UTC'] - Default timezone for operations
 * @property {string} [defaultLocale='en-US'] - Default locale for formatting
 * @property {Weekday} [weekStartsOn=0] - First day of week (0 = Sunday)
 * @property {BusinessDayConfig} [businessDays] - Business day configuration
 */
export interface DateConfig {
    defaultTimezone?: string;
    defaultLocale?: string;
    weekStartsOn?: Weekday;
    businessDays?: BusinessDayConfig;
}
/**
 * Validation result
 * @interface ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of validation error messages
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
//# sourceMappingURL=types.d.ts.map