/**
 * Testes para Funções de Parsing
 * Cobertura completa de conversão e validação de tipos
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseCargos,
  parseBoolean,
  parseNumber,
  parseFloat,
  parseDate,
  parseBirthDate,
  parseEmail,
  parsePhone,
  parseId,
  parseIds,
  sanitizeString,
  parseUserRole
} from '../utils/parsers';

describe('Parsers', () => {
  // ============================================
  // parseCargos
  // ============================================
  describe('parseCargos', () => {
    it('should parse comma-separated string', () => {
      expect(parseCargos('Pastor, Líder, Músico')).toEqual(['Pastor', 'Líder', 'Músico']);
    });

    it('should handle array input', () => {
      expect(parseCargos(['Pastor', 'Líder'])).toEqual(['Pastor', 'Líder']);
    });

    it('should filter non-string values from array', () => {
      expect(parseCargos(['Pastor', 123, null, 'Líder'])).toEqual(['Pastor', 'Líder']);
    });

    it('should return empty array for falsy values', () => {
      expect(parseCargos(null)).toEqual([]);
      expect(parseCargos(undefined)).toEqual([]);
      expect(parseCargos('')).toEqual([]);
    });

    it('should trim whitespace and filter empty strings', () => {
      expect(parseCargos('Pastor,  ,Líder, ')).toEqual(['Pastor', 'Líder']);
    });

    it('should return empty array for non-string/non-array', () => {
      expect(parseCargos(123)).toEqual([]);
      expect(parseCargos({ cargo: 'Pastor' })).toEqual([]);
    });
  });

  // ============================================
  // parseBoolean
  // ============================================
  describe('parseBoolean', () => {
    it('should return boolean as-is', () => {
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
    });

    it('should convert numbers', () => {
      expect(parseBoolean(1)).toBe(true);
      expect(parseBoolean(0)).toBe(false);
      expect(parseBoolean(-1)).toBe(true);
      expect(parseBoolean(100)).toBe(true);
    });

    it('should parse string "true" variants', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('sim')).toBe(true);
      expect(parseBoolean('SIM')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
      expect(parseBoolean('YES')).toBe(true);
    });

    it('should parse string "false" variants', () => {
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('não')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('no')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(parseBoolean('  true  ')).toBe(true);
      expect(parseBoolean('  sim  ')).toBe(true);
    });

    it('should convert other values using truthiness', () => {
      expect(parseBoolean(null)).toBe(false);
      expect(parseBoolean(undefined)).toBe(false);
      expect(parseBoolean({})).toBe(true);
      expect(parseBoolean([])).toBe(true);
    });
  });

  // ============================================
  // parseNumber
  // ============================================
  describe('parseNumber', () => {
    it('should return integer for valid number', () => {
      expect(parseNumber(42)).toBe(42);
      expect(parseNumber(42.9)).toBe(42);
      expect(parseNumber(-10)).toBe(-10);
    });

    it('should parse string numbers', () => {
      expect(parseNumber('42')).toBe(42);
      expect(parseNumber('  42  ')).toBe(42);
      expect(parseNumber('-10')).toBe(-10);
    });

    it('should return 0 for NaN', () => {
      expect(parseNumber(NaN)).toBe(0);
      expect(parseNumber('abc')).toBe(0);
      expect(parseNumber('')).toBe(0);
    });

    it('should return 0 for non-numeric types', () => {
      expect(parseNumber(null)).toBe(0);
      expect(parseNumber(undefined)).toBe(0);
      expect(parseNumber({})).toBe(0);
      expect(parseNumber([])).toBe(0);
    });
  });

  // ============================================
  // parseFloat
  // ============================================
  describe('parseFloat', () => {
    it('should return float as-is', () => {
      expect(parseFloat(42.5)).toBe(42.5);
      expect(parseFloat(100)).toBe(100);
    });

    it('should parse string floats', () => {
      expect(parseFloat('42.5')).toBe(42.5);
      expect(parseFloat('  42.5  ')).toBe(42.5);
    });

    it('should handle Brazilian comma format', () => {
      expect(parseFloat('42,5')).toBe(42.5);
      expect(parseFloat('1000,99')).toBe(1000.99);
    });

    it('should return 0 for NaN', () => {
      expect(parseFloat(NaN)).toBe(0);
      expect(parseFloat('abc')).toBe(0);
    });

    it('should return 0 for non-numeric types', () => {
      expect(parseFloat(null)).toBe(0);
      expect(parseFloat(undefined)).toBe(0);
    });
  });

  // ============================================
  // parseDate
  // ============================================
  describe('parseDate', () => {
    it('should return null for falsy values', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate('')).toBeNull();
    });

    it('should return Date object as-is if valid', () => {
      const date = new Date(2024, 0, 15);
      const result = parseDate(date);
      expect(result).toEqual(date);
    });

    it('should return null for invalid Date object', () => {
      expect(parseDate(new Date('invalid'))).toBeNull();
    });

    it('should parse DD/MM/YYYY format', () => {
      const result = parseDate('15/01/2024');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse DD/MM/YY format with century conversion', () => {
      const result2024 = parseDate('15/01/24');
      expect(result2024?.getFullYear()).toBe(2024);

      const result1990 = parseDate('15/01/90');
      expect(result1990?.getFullYear()).toBe(1990);
    });

    it('should parse DD/MM format (current year)', () => {
      const result = parseDate('15/01');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getFullYear()).toBe(new Date().getFullYear());
    });

    it('should parse YYYY-MM-DD format (ISO)', () => {
      const result = parseDate('2024-01-15');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse DD-MM-YYYY format', () => {
      const result = parseDate('15-01-2024');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse YYYY/MM/DD format', () => {
      const result = parseDate('2024/01/15');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse DD.MM.YYYY format', () => {
      const result = parseDate('15.01.2024');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse DD.MM.YY format', () => {
      const result = parseDate('15.01.24');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should reject invalid dates', () => {
      expect(parseDate('32/01/2024')).toBeNull(); // Day > 31
      expect(parseDate('15/13/2024')).toBeNull(); // Month > 12
      expect(parseDate('31/02/2024')).toBeNull(); // Feb 31
    });

    it('should strip quotes from string', () => {
      const result = parseDate('"15/01/2024"');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
    });
  });

  // ============================================
  // parseBirthDate
  // ============================================
  describe('parseBirthDate', () => {
    it('should return YYYY-MM-DD format', () => {
      expect(parseBirthDate('15/01/2024')).toBe('2024-01-15');
    });

    it('should pad single digits', () => {
      expect(parseBirthDate('5/1/2024')).toBe('2024-01-05');
    });

    it('should return null for invalid date', () => {
      expect(parseBirthDate('invalid')).toBeNull();
      expect(parseBirthDate(null)).toBeNull();
    });
  });

  // ============================================
  // parseEmail
  // ============================================
  describe('parseEmail', () => {
    it('should normalize and validate email', () => {
      expect(parseEmail('Test@Example.COM')).toBe('test@example.com');
      expect(parseEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should return null for invalid email', () => {
      expect(parseEmail('invalid')).toBeNull();
      expect(parseEmail('test@')).toBeNull();
      expect(parseEmail('@example.com')).toBeNull();
      expect(parseEmail('test@example')).toBeNull();
    });

    it('should return null for non-string values', () => {
      expect(parseEmail(null)).toBeNull();
      expect(parseEmail(undefined)).toBeNull();
      expect(parseEmail(123)).toBeNull();
    });
  });

  // ============================================
  // parsePhone
  // ============================================
  describe('parsePhone', () => {
    it('should extract digits from phone number', () => {
      expect(parsePhone('(11) 99999-9999')).toBe('11999999999');
      expect(parsePhone('11 99999 9999')).toBe('11999999999');
      expect(parsePhone('+55 11 99999-9999')).toBeNull(); // Too many digits
    });

    it('should accept 10-11 digit phones (Brazilian format)', () => {
      expect(parsePhone('1199999999')).toBe('1199999999'); // 10 digits
      expect(parsePhone('11999999999')).toBe('11999999999'); // 11 digits
    });

    it('should return null for invalid phones', () => {
      expect(parsePhone('123')).toBeNull(); // Too short
      expect(parsePhone('123456789012')).toBeNull(); // Too long
    });

    it('should return null for non-string values', () => {
      expect(parsePhone(null)).toBeNull();
      expect(parsePhone(undefined)).toBeNull();
      expect(parsePhone(11999999999)).toBeNull();
    });
  });

  // ============================================
  // parseId
  // ============================================
  describe('parseId', () => {
    it('should return valid positive integer ID', () => {
      expect(parseId(42)).toBe(42);
      expect(parseId(42.9)).toBe(42);
      expect(parseId('42')).toBe(42);
      expect(parseId('  42  ')).toBe(42);
    });

    it('should return null for invalid IDs', () => {
      expect(parseId(0)).toBeNull();
      expect(parseId(-1)).toBeNull();
      expect(parseId(NaN)).toBeNull();
      expect(parseId('abc')).toBeNull();
      expect(parseId('')).toBeNull();
      expect(parseId(null)).toBeNull();
      expect(parseId(undefined)).toBeNull();
    });
  });

  // ============================================
  // parseIds
  // ============================================
  describe('parseIds', () => {
    it('should parse array of IDs', () => {
      expect(parseIds([1, 2, 3])).toEqual([1, 2, 3]);
      expect(parseIds(['1', '2', '3'])).toEqual([1, 2, 3]);
    });

    it('should filter invalid IDs from array', () => {
      expect(parseIds([1, 0, -1, 2, 'abc', 3])).toEqual([1, 2, 3]);
    });

    it('should parse comma-separated string', () => {
      expect(parseIds('1, 2, 3')).toEqual([1, 2, 3]);
      expect(parseIds('1,2,3')).toEqual([1, 2, 3]);
    });

    it('should return empty array for invalid input', () => {
      expect(parseIds(null)).toEqual([]);
      expect(parseIds(undefined)).toEqual([]);
      expect(parseIds(123)).toEqual([]);
      expect(parseIds({})).toEqual([]);
    });
  });

  // ============================================
  // sanitizeString
  // ============================================
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove < and > characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(15000);
      expect(sanitizeString(longString).length).toBe(10000);
    });

    it('should handle non-string values', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(true)).toBe('true');
    });
  });

  // ============================================
  // parseUserRole
  // ============================================
  describe('parseUserRole', () => {
    it('should return valid roles', () => {
      expect(parseUserRole('superadmin')).toBe('superadmin');
      expect(parseUserRole('pastor')).toBe('pastor');
      expect(parseUserRole('member')).toBe('member');
      expect(parseUserRole('interested')).toBe('interested');
      expect(parseUserRole('missionary')).toBe('missionary');
      expect(parseUserRole('admin_readonly')).toBe('admin_readonly');
    });

    it('should normalize case', () => {
      expect(parseUserRole('SUPERADMIN')).toBe('superadmin');
      expect(parseUserRole('Pastor')).toBe('pastor');
      expect(parseUserRole('MEMBER')).toBe('member');
    });

    it('should trim whitespace', () => {
      expect(parseUserRole('  pastor  ')).toBe('pastor');
    });

    it('should return null for invalid roles', () => {
      expect(parseUserRole('admin')).toBeNull();
      expect(parseUserRole('user')).toBeNull();
      expect(parseUserRole('invalid')).toBeNull();
      expect(parseUserRole('')).toBeNull();
    });

    it('should return null for non-string values', () => {
      expect(parseUserRole(null)).toBeNull();
      expect(parseUserRole(undefined)).toBeNull();
      expect(parseUserRole(123)).toBeNull();
      expect(parseUserRole(['pastor'])).toBeNull();
    });
  });
});
