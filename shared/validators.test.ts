/**
 * @fileoverview Testes para funções de validação compartilhadas
 * @module shared/validators.test
 */

import { describe, it, expect } from 'vitest';
import {
  generateChurchCode,
  generateDistrictCode,
  isValidCpfFormat,
  formatCpf,
  isValidPhoneFormat,
  formatPhone,
  isValidEmail,
  normalizeString,
  sanitizeForCode,
  generateUniqueId,
  truncateString,
  capitalizeWords,
  calculateAge,
  isValidDate,
  formatDateBR,
  formatDateTimeBR,
} from './validators';

// ── generateChurchCode ──────────────────────────────

describe('generateChurchCode', () => {
  it('should generate code from church name initials', () => {
    expect(generateChurchCode('Igreja Adventista do Sétimo Dia')).toBe('IADSD');
  });

  it('should handle single word name', () => {
    expect(generateChurchCode('Central')).toBe('C');
  });

  it('should handle empty string gracefully', () => {
    expect(generateChurchCode('')).toBe('CH');
  });

  it('should remove non-alphanumeric characters', () => {
    expect(generateChurchCode('São Paulo')).toBe('SP');
  });

  it('should truncate to max 10 characters', () => {
    const longName = 'A B C D E F G H I J K L M N O';
    expect(generateChurchCode(longName).length).toBeLessThanOrEqual(10);
  });

  it('should uppercase the result', () => {
    expect(generateChurchCode('igreja central')).toBe('IC');
  });

  it('should handle multiple spaces between words', () => {
    expect(generateChurchCode('Igreja   Central')).toBe('IC');
  });
});

// ── generateDistrictCode ────────────────────────────

describe('generateDistrictCode', () => {
  it('should generate code from district name initials', () => {
    expect(generateDistrictCode('Distrito Norte')).toBe('DN');
  });

  it('should return DT for empty string', () => {
    expect(generateDistrictCode('')).toBe('DT');
  });

  it('should truncate to max 10 characters', () => {
    const longName = 'A B C D E F G H I J K L M N O';
    expect(generateDistrictCode(longName).length).toBeLessThanOrEqual(10);
  });
});

// ── isValidCpfFormat ────────────────────────────────

describe('isValidCpfFormat', () => {
  it('should return true for valid CPF with 11 digits', () => {
    expect(isValidCpfFormat('12345678901')).toBe(true);
  });

  it('should return true for formatted CPF', () => {
    expect(isValidCpfFormat('123.456.789-01')).toBe(true);
  });

  it('should return false for CPF with wrong length', () => {
    expect(isValidCpfFormat('1234567890')).toBe(false);
    expect(isValidCpfFormat('123456789012')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidCpfFormat('')).toBe(false);
  });
});

// ── formatCpf ───────────────────────────────────────

describe('formatCpf', () => {
  it('should format 11-digit CPF correctly', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
  });

  it('should return original if not 11 digits after cleaning', () => {
    expect(formatCpf('123')).toBe('123');
  });

  it('should handle already formatted CPF', () => {
    expect(formatCpf('123.456.789-01')).toBe('123.456.789-01');
  });
});

// ── isValidPhoneFormat ──────────────────────────────

describe('isValidPhoneFormat', () => {
  it('should return true for 10-digit phone (landline)', () => {
    expect(isValidPhoneFormat('1134567890')).toBe(true);
  });

  it('should return true for 11-digit phone (mobile)', () => {
    expect(isValidPhoneFormat('11934567890')).toBe(true);
  });

  it('should return true for formatted phone', () => {
    expect(isValidPhoneFormat('(11) 93456-7890')).toBe(true);
  });

  it('should return false for phone with wrong length', () => {
    expect(isValidPhoneFormat('123456789')).toBe(false);
    expect(isValidPhoneFormat('123456789012')).toBe(false);
  });
});

// ── formatPhone ─────────────────────────────────────

describe('formatPhone', () => {
  it('should format 11-digit mobile phone', () => {
    expect(formatPhone('11934567890')).toBe('(11) 93456-7890');
  });

  it('should format 10-digit landline phone', () => {
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
  });

  it('should return original for non-standard length', () => {
    expect(formatPhone('123')).toBe('123');
  });
});

// ── isValidEmail ────────────────────────────────────

describe('isValidEmail', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co')).toBe(true);
    expect(isValidEmail('user+tag@gmail.com')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

// ── normalizeString ─────────────────────────────────

describe('normalizeString', () => {
  it('should lowercase and remove accents', () => {
    expect(normalizeString('São Paulo')).toBe('sao paulo');
    expect(normalizeString('CAFÉ')).toBe('cafe');
    expect(normalizeString('Ação')).toBe('acao');
  });

  it('should handle already normalized string', () => {
    expect(normalizeString('hello world')).toBe('hello world');
  });
});

// ── sanitizeForCode ─────────────────────────────────

describe('sanitizeForCode', () => {
  it('should uppercase, remove accents and non-alphanumeric chars', () => {
    expect(sanitizeForCode('São Paulo!')).toBe('SAOPAULO');
  });

  it('should keep numbers', () => {
    expect(sanitizeForCode('Test 123')).toBe('TEST123');
  });
});

// ── generateUniqueId ────────────────────────────────

describe('generateUniqueId', () => {
  it('should generate uppercase string', () => {
    const id = generateUniqueId();
    expect(id).toMatch(/^[A-Z0-9]+$/);
  });

  it('should prepend prefix when provided', () => {
    const id = generateUniqueId('USR');
    expect(id.startsWith('USR')).toBe(true);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUniqueId()));
    expect(ids.size).toBe(100);
  });
});

// ── truncateString ──────────────────────────────────

describe('truncateString', () => {
  it('should not truncate short strings', () => {
    expect(truncateString('hello', 10)).toBe('hello');
  });

  it('should truncate and add ellipsis for long strings', () => {
    expect(truncateString('hello world', 8)).toBe('hello...');
  });

  it('should handle exact length', () => {
    expect(truncateString('hello', 5)).toBe('hello');
  });
});

// ── capitalizeWords ─────────────────────────────────

describe('capitalizeWords', () => {
  it('should capitalize first letter of each word', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World');
  });

  it('should handle all uppercase input', () => {
    expect(capitalizeWords('HELLO WORLD')).toBe('Hello World');
  });

  it('should handle single word', () => {
    expect(capitalizeWords('test')).toBe('Test');
  });
});

// ── calculateAge ────────────────────────────────────

describe('calculateAge', () => {
  it('should calculate age from Date object', () => {
    const today = new Date();
    const birthDate = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
    expect(calculateAge(birthDate)).toBe(30);
  });

  it('should calculate age from string', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    // Use a date that's definitely in the past this year
    const birthDate = `${birthYear}-01-01`;
    expect(calculateAge(birthDate)).toBeGreaterThanOrEqual(24);
    expect(calculateAge(birthDate)).toBeLessThanOrEqual(25);
  });

  it('should handle birthday not yet this year', () => {
    const today = new Date();
    const futureMonth = today.getMonth() + 2; // 2 months from now
    if (futureMonth <= 11) {
      const birthDate = new Date(today.getFullYear() - 20, futureMonth, 1);
      expect(calculateAge(birthDate)).toBe(19);
    }
  });
});

// ── isValidDate ─────────────────────────────────────

describe('isValidDate', () => {
  it('should return true for valid Date object', () => {
    expect(isValidDate(new Date())).toBe(true);
  });

  it('should return true for valid date string', () => {
    expect(isValidDate('2024-01-15')).toBe(true);
  });

  it('should return false for invalid Date', () => {
    expect(isValidDate(new Date('invalid'))).toBe(false);
  });

  it('should return false for non-date values', () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate(123)).toBe(false);
  });

  it('should return false for invalid string', () => {
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

// ── formatDateBR ────────────────────────────────────

describe('formatDateBR', () => {
  it('should format date to DD/MM/YYYY', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const result = formatDateBR(date);
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should handle string input', () => {
    const result = formatDateBR('2024-06-20');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return empty string for invalid date', () => {
    expect(formatDateBR('invalid')).toBe('');
  });
});

// ── formatDateTimeBR ────────────────────────────────

describe('formatDateTimeBR', () => {
  it('should format date and time', () => {
    const date = new Date(2024, 0, 15, 14, 30);
    const result = formatDateTimeBR(date);
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDateTimeBR('invalid')).toBe('');
  });
});
