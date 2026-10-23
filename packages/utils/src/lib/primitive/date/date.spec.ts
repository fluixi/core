/**
 * @file Date utility tests
 * @description Comprehensive test suite for date utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  configureDateUtils,
  resetDateConfig,
  parseDate,
  formatDate,
  isDate,
  createDate,
  add,
  subtract,
  addDays,
  subtractDays,
  addMonths,
  subtractMonths,
  addYears,
  subtractYears,
  startOf,
  endOf,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  isBetween,
  isBefore,
  isAfter,
  isSame,
  isToday,
  isPast,
  isFuture,
  difference,
  humanizeDifference,
  daysBetween,
  monthsBetween,
  yearsBetween,
  isWeekend,
  isWeekday,
  isBusinessDay,
  addBusinessDays,
  getAge,
  getWeekNumber,
  getQuarter,
  getDayName,
  getMonthName,
  getDaysInMonth,
  isLeapYear,
  validateDate,
  getTimezoneInfo,
  convertTimezone,
  now,
  today,
  tomorrow,
  yesterday,
} from './date.js';

// Mock Date for consistent testing
const REAL_DATE = Date;
const mockDate = new Date('2024-01-15T10:30:45.123Z');

/**
 * Setup mock date before each test
 */

/**
 * Restore original Date after each test
 */

/**
 * Test suite for date utilities
 */
describe('Date Utilities', () => {
  /**
   * Test configuration functions
   */
  describe('Configuration', () => {
    it('should configure and reset date utils', () => {
      configureDateUtils({
        weekStartsOn: 1, // Monday
        defaultLocale: 'fr-FR',
      });

      // Configuration should be applied
      // (Implementation specific assertions would go here)

      resetDateConfig();
      // Configuration should be reset to defaults
    });
  });

  /**
   * Test date parsing functionality
   */
  describe('parseDate', () => {
    it('should parse ISO dates', () => {
      const date = parseDate('2024-01-15T10:30:45.123Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2024-01-15T10:30:45.123Z');
    });

    it('should parse US dates', () => {
      const date = parseDate('01/15/2024', { format: 'US' });
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse EU dates', () => {
      const date = parseDate('15/01/2024', { format: 'EU' });
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse timestamps', () => {
      const date = parseDate('20240115103045', { format: 'TIMESTAMP' });
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(10);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });

    it('should parse with custom format', () => {
      const date = parseDate('2024-15-01', {
        format: 'CUSTOM',
        customFormat: 'YYYY-DD-MM',
      });
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should throw error for invalid dates', () => {
      expect(() => parseDate('invalid-date')).toThrow();
      expect(() => parseDate('2024-13-01')).toThrow();
      expect(() => parseDate('2024-01-32')).toThrow();
    });

    it('should accept Date objects', () => {
      const input = new Date('2024-01-15');
      const parsed = parseDate(input);
      expect(parsed).toBe(input);
    });

    it('should accept timestamps', () => {
      const timestamp = 1705314600000; // 2024-01-15T10:30:00.000Z
      const parsed = parseDate(timestamp);
      expect(parsed.getTime()).toBe(timestamp);
    });
  });

  /**
   * Test date formatting functionality
   */
  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:45.123Z');

    it('should format as ISO', () => {
      expect(formatDate(testDate, { format: 'ISO' })).toBe(
        '2024-01-15T10:30:45.123Z'
      );
    });

    it('should format as ISO_DATE', () => {
      expect(formatDate(testDate, { format: 'ISO_DATE' })).toBe('2024-01-15');
    });

    it('should format as US', () => {
      expect(formatDate(testDate, { format: 'US' })).toBe('01/15/2024');
    });

    it('should format as EU', () => {
      expect(formatDate(testDate, { format: 'EU' })).toBe('15/01/2024');
    });

    it('should format as FULL', () => {
      const formatted = formatDate(testDate, { format: 'FULL' });
      expect(formatted).toMatch(/Monday, January 15, 2024/);
    });

    it('should format as MEDIUM', () => {
      const formatted = formatDate(testDate, { format: 'MEDIUM' });
      expect(formatted).toBe('Jan 15, 2024');
    });

    it('should format as SHORT', () => {
      const formatted = formatDate(testDate, { format: 'SHORT' });
      expect(formatted).toBe('1/15/24');
    });

    it('should format as TIME', () => {
      const formatted = formatDate(testDate, { format: 'TIME' });
      expect(formatted).toMatch(/(10:30 AM|10:30:45 AM)/);
    });

    it('should format as TIME_24', () => {
      const formatted = formatDate(testDate, {
        format: 'TIME_24',
        includeSeconds: true,
      });
      expect(formatted).toBe('10:30:45');
    });

    it('should format as DATETIME', () => {
      const formatted = formatDate(testDate, { format: 'DATETIME' });
      expect(formatted).toMatch(/Jan 15, 2024, 10:30 AM/);
    });

    it('should format as TIMESTAMP', () => {
      expect(formatDate(testDate, { format: 'TIMESTAMP' })).toBe(
        '20240115103045'
      );
    });

    it('should format with custom format', () => {
      const formatted = formatDate(testDate, {
        format: 'CUSTOM',
        customFormat: 'YYYY-MM-DD HH:mm:ss',
      });
      expect(formatted).toBe('2024-01-15 10:30:45');
    });

    it('should handle different locales', () => {
      const formatted = formatDate(testDate, {
        format: 'FULL',
        locale: 'fr-FR',
      });
      expect(formatted).toBeTruthy();
    });
  });

  /**
   * Test date manipulation functions
   */
  describe('Date Manipulation', () => {
    const testDate = new Date('2024-01-15T10:30:45.123Z');

    it('should add days', () => {
      const result = addDays(testDate, 5);
      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0);
    });

    it('should subtract days', () => {
      const result = subtractDays(testDate, 5);
      expect(result.getDate()).toBe(10);
    });

    it('should add months', () => {
      const result = addMonths(testDate, 2);
      expect(result.getMonth()).toBe(2);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should subtract months', () => {
      const result = subtractMonths(testDate, 2);
      expect(result.getMonth()).toBe(10);
      expect(result.getFullYear()).toBe(2023);
    });

    it('should add years', () => {
      const result = addYears(testDate, 2);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should subtract years', () => {
      const result = subtractYears(testDate, 2);
      expect(result.getFullYear()).toBe(2022);
    });

    it('should add hours', () => {
      const result = add(testDate, 3, 'hour');
      expect(result.getHours()).toBe(13);
    });

    it('should handle month overflow correctly', () => {
      const date = new Date('2024-12-31');
      const result = addMonths(date, 1);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(31);
    });
  });

  /**
   * Test start/end functions
   */
  describe('Start/End Functions', () => {
    const testDate = new Date('2024-01-15T10:30:45.123Z');

    it('should get start of day', () => {
      const result = startOfDay(testDate);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should get end of day', () => {
      const result = endOfDay(testDate);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('should get start of month', () => {
      const result = startOfMonth(testDate);
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('should get end of month', () => {
      const result = endOfMonth(testDate);
      expect(result.getDate()).toBe(31);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('should get start of year', () => {
      const result = startOfYear(testDate);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
    });

    it('should get end of year', () => {
      const result = endOfYear(testDate);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(31);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('should get start of week (Sunday)', () => {
      const result = startOfWeek(testDate);
      expect(result.getDay()).toBe(0);
      expect(result.getDate()).toBe(14);
    });

    it('should get end of week', () => {
      const result = endOfWeek(testDate);
      expect(result.getDay()).toBe(6);
      expect(result.getDate()).toBe(20);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });

    it('should handle startOf with different units', () => {
      expect(startOf(testDate, 'hour').getMinutes()).toBe(0);
      expect(startOf(testDate, 'minute').getSeconds()).toBe(0);
      expect(startOf(testDate, 'second').getMilliseconds()).toBe(0);
      expect(startOf(testDate, 'quarter').getMonth()).toBe(0);
    });
  });

  /**
   * Test comparison functions
   */
  describe('Comparison Functions', () => {
    const date1 = new Date('2024-01-15T10:30:00Z');
    const date2 = new Date('2024-01-20T10:30:00Z');
    const date3 = new Date('2024-01-15T15:30:00Z');

    it('should check if date is before', () => {
      expect(isBefore(date1, date2)).toBe(true);
      expect(isBefore(date2, date1)).toBe(false);
    });

    it('should check if date is after', () => {
      expect(isAfter(date2, date1)).toBe(true);
      expect(isAfter(date1, date2)).toBe(false);
    });

    it('should check if dates are the same', () => {
      expect(isSame(date1, date1)).toBe(true);
      expect(isSame(date1, date2)).toBe(false);
    });

    it('should check if dates are same day', () => {
      expect(isSame(date1, date3, 'day')).toBe(true);
      expect(isSame(date1, date2, 'day')).toBe(false);
    });

    it('should check if date is between two dates', () => {
      expect(isBetween(date3, date1, date2)).toBe(true);
      expect(isBetween(date2, date1, date3)).toBe(false);
    });

    it('should check if date is today', () => {
      const todayDate = today();
      expect(isToday(todayDate)).toBe(true);
      expect(isToday(yesterday())).toBe(false);
    });

    it('should check if date is in past/future', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');

      expect(isPast(pastDate)).toBe(true);
      expect(isPast(futureDate)).toBe(false);

      expect(isFuture(futureDate)).toBe(true);
      expect(isFuture(pastDate)).toBe(false);
    });
  });

  /**
   * Test difference calculation functions
   */
  describe('Difference Functions', () => {
    const date1 = new Date('2024-01-10T10:30:00Z');
    const date2 = new Date('2024-01-15T15:45:30Z');

    it('should calculate difference between dates', () => {
      const diff = difference(date1, date2);

      expect(diff.days).toBe(5);
      expect(diff.hours).toBe(125);
      expect(diff.minutes).toBe(5 * 24 * 60 + 5 * 60 + 15);
      expect(diff.totalDays).toBe(5);
      expect(diff.totalHours).toBe(5 * 24 + 5);
      expect(diff.totalMinutes).toBe(5 * 24 * 60 + 5 * 60 + 15);
    });

    it('should humanize difference', () => {
      expect(humanizeDifference(date1, date2)).toMatch(/5d ago/);
      expect(humanizeDifference(date2, date1, true)).toMatch(/5 days in/);
    });

    it('should calculate days between', () => {
      expect(daysBetween(date1, date2)).toBe(5);
      expect(daysBetween(date1, date2, true)).toBe(6);
    });

    it('should calculate months between', () => {
      const jan1 = new Date('2024-01-01');
      const mar1 = new Date('2024-03-01');
      expect(monthsBetween(jan1, mar1)).toBe(2);
    });

    it('should calculate years between', () => {
      const date1 = new Date('2020-06-15');
      const date2 = new Date('2024-01-15');
      expect(yearsBetween(date1, date2)).toBe(4);
    });
  });

  /**
   * Test utility functions
   */
  describe('Utility Functions', () => {
    it('should check weekend/weekday', () => {
      const monday = new Date('2024-01-15');
      const saturday = new Date('2024-01-20');

      expect(isWeekday(monday)).toBe(true);
      expect(isWeekend(monday)).toBe(false);

      expect(isWeekday(saturday)).toBe(false);
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should check business days', () => {
      const monday = new Date('2024-01-15');
      const saturday = new Date('2024-01-20');

      expect(isBusinessDay(monday)).toBe(true);
      expect(isBusinessDay(saturday)).toBe(false);
    });

    it('should add business days', () => {
      const friday = new Date('2024-01-12');
      const result = addBusinessDays(friday, 3);

      expect(result.getDay()).toBe(3);
      expect(result.getDate()).toBe(17);
    });

    it('should calculate age', () => {
      const birthDate = new Date('1990-06-15');
      const asOfDate = new Date('2024-01-15');

      expect(getAge(birthDate, asOfDate)).toBe(33);
    });

    it('should get week number', () => {
      const date = new Date('2024-01-15');
      expect(getWeekNumber(date)).toBe(3);
    });

    it('should get quarter', () => {
      expect(getQuarter(new Date('2024-01-15'))).toBe(1);
      expect(getQuarter(new Date('2024-04-15'))).toBe(2);
      expect(getQuarter(new Date('2024-07-15'))).toBe(3);
      expect(getQuarter(new Date('2024-10-15'))).toBe(4);
    });

    it('should get day name', () => {
      const monday = new Date('2024-01-15');
      expect(getDayName(monday)).toBe('Monday');
      expect(getDayName(monday, 'short')).toBe('Mon');
    });

    it('should get month name', () => {
      const january = new Date('2024-01-15');
      expect(getMonthName(january)).toBe('January');
      expect(getMonthName(january, 'short')).toBe('Jan');
    });

    it('should get days in month', () => {
      expect(getDaysInMonth(new Date('2024-01-15'))).toBe(31);
      expect(getDaysInMonth(new Date('2024-02-15'))).toBe(29);
      expect(getDaysInMonth(new Date('2023-02-15'))).toBe(28);
    });

    it('should check leap year', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
    });
  });

  /**
   * Test validation functions
   */
  describe('Validation', () => {
    it('should validate dates', () => {
      const validResult = validateDate('2024-01-15');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateDate('invalid-date');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should validate with min/max constraints', () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');
      const testDate = new Date('2024-06-15');

      const result = validateDate(testDate, {
        min: minDate,
        max: maxDate,
      });

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for out-of-range dates', () => {
      const minDate = new Date('2024-01-01');
      const testDate = new Date('2023-12-31');

      const result = validateDate(testDate, {
        min: minDate,
      });

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.startsWith('Date must be on or after')
        )
      ).toBe(true);
    });

    it('should validate past/future constraints', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');

      expect(validateDate(pastDate, { allowPast: false }).isValid).toBe(false);
      expect(validateDate(futureDate, { allowFuture: false }).isValid).toBe(
        false
      );
    });
  });

  /**
   * Test timezone functions
   */
  describe('Timezone Functions', () => {
    it('should get timezone info', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const info = getTimezoneInfo(date);

      expect(info).toHaveProperty('abbreviation');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('offset');
      expect(info).toHaveProperty('offsetString');
      expect(info).toHaveProperty('isDST');
    });

    it('should convert timezone', () => {
      const date = new Date('2024-01-15T10:30:00Z');

      const utcDate = convertTimezone(date, 'UTC');
      expect(utcDate.getTime()).toBe(date.getTime());

      const nyDate = convertTimezone(date, 'America/New_York');
      expect(nyDate).toBeInstanceOf(Date);
    });
  });

  /**
   * Test helper functions
   */
  describe('Helper Functions', () => {
    it('should get current date/time', () => {
      const current = now();
      expect(current).toBeInstanceOf(Date);
    });

    it('should get today at midnight', () => {
      const todayDate = today();
      expect(todayDate.getHours()).toBe(0);
      expect(todayDate.getMinutes()).toBe(0);
      expect(todayDate.getSeconds()).toBe(0);
    });

    it('should get tomorrow and yesterday', () => {
      const todayDate = today();
      const tomorrowDate = tomorrow();
      const yesterdayDate = yesterday();

      expect(daysBetween(todayDate, tomorrowDate)).toBe(1);
      expect(daysBetween(yesterdayDate, todayDate)).toBe(1);
    });

    it('should create date from parts', () => {
      const date = createDate(2024, 0, 15, 10, 30, 45);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(10);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });

    it('should validate date creation', () => {
      expect(() => createDate(2024, 12 as any, 15)).toThrow();
      expect(() => createDate(2024, 0, 32)).toThrow();
      expect(() => createDate(2024, 0, 15, 25, 0, 0)).toThrow();
    });
  });

  /**
   * Test edge cases
   */
  describe('Edge Cases', () => {
    it('should handle date string parsing edge cases', () => {
      const date1 = parseDate('01/15/24', { format: 'US' });
      expect(date1.getFullYear()).toBe(2024);

      const date2 = parseDate('2024-01-15');
      expect(date2.getFullYear()).toBe(2024);

      const date3 = parseDate('2024-01-15T23:59:59.999Z');
      expect(date3.getHours()).toBe(23);
    });

    it('should handle February 29 in leap years', () => {
      const leapYearDate = parseDate('2024-02-29');
      expect(leapYearDate.getDate()).toBe(29);
      expect(leapYearDate.getMonth()).toBe(1);
      expect(leapYearDate.getFullYear()).toBe(2024);

      expect(() => parseDate('2023-23-29')).toThrow();
    });

    it('should handle timezone offsets', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');

      const nyTime = formatDate(date, {
        format: 'TIME_24',
        timezone: 'America/New_York',
      });
      expect(nyTime).toBeTruthy();
    });
  });

  /**
   * Test performance characteristics
   */
  describe('Performance and Memory', () => {
    it('should handle many dates efficiently', () => {
      const dates: Date[] = [];
      const start = new Date('2024-01-01');

      for (let i = 0; i < 1000; i++) {
        dates.push(addDays(start, i));
      }

      const formatted = dates.map((date) =>
        formatDate(date, { format: 'ISO_DATE' })
      );

      expect(formatted).toHaveLength(1000);
      expect(formatted[0]).toBe('2024-01-01');
      expect(formatted[999]).toBe('2026-09-26');
    });
  });
});
