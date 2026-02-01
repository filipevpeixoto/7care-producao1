/**
 * Testes do módulo de validação
 */

const {
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  validatePassword,
  validateUserData,
  parseDate,
  parseBool,
  parseNumber,
  formatPhoneNumber
} = require('../../netlify/functions/modules/validation.cjs');

describe('Validation Module', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should return non-strings unchanged', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values', () => {
      const input = { name: '  John  ', bio: '<script>bad</script>' };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.bio).toBe('scriptbad/script');
    });

    it('should handle nested objects', () => {
      const input = { user: { name: '  Jane  ' } };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('Jane');
    });

    it('should handle arrays', () => {
      const input = ['  a  ', '  b  '];
      const result = sanitizeObject(input);
      expect(result).toEqual(['a', 'b']);
    });

    it('should handle null/undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate Brazilian phone numbers', () => {
      expect(isValidPhone('11999998888')).toBe(true);
      expect(isValidPhone('(11) 99999-8888')).toBe(true);
      expect(isValidPhone('1199998888')).toBe(true);
    });

    it('should return true for empty phones (optional field)', () => {
      expect(isValidPhone('')).toBe(true);
      expect(isValidPhone(null)).toBe(true);
    });

    it('should reject invalid phones', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('123456789012345')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(validatePassword('123456')).toEqual({ valid: true });
      expect(validatePassword('strongPassword123')).toEqual({ valid: true });
    });

    it('should reject short passwords', () => {
      const result = validatePassword('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('6 caracteres');
    });

    it('should reject empty passwords', () => {
      expect(validatePassword('')).toEqual({ valid: false, error: 'Senha é obrigatória' });
      expect(validatePassword(null)).toEqual({ valid: false, error: 'Senha é obrigatória' });
    });
  });

  describe('validateUserData', () => {
    it('should validate complete user data for creation', () => {
      const userData = {
        name: 'João Silva',
        email: 'joao@example.com',
        role: 'member'
      };
      expect(validateUserData(userData)).toEqual({ valid: true, errors: [] });
    });

    it('should require name and email for creation', () => {
      const result = validateUserData({ name: '', email: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow partial data for updates', () => {
      const result = validateUserData({ phone: '11999998888' }, true);
      expect(result.valid).toBe(true);
    });

    it('should validate role values', () => {
      const result = validateUserData({ name: 'Test', email: 'test@test.com', role: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Role inválido');
    });
  });

  describe('parseDate', () => {
    it('should parse DD/MM/YYYY format', () => {
      const date = parseDate('25/12/2023');
      expect(date).toBeInstanceOf(Date);
      expect(date.getDate()).toBe(25);
      expect(date.getMonth()).toBe(11); // December is 11
      expect(date.getFullYear()).toBe(2023);
    });

    it('should parse DD-MM-YYYY format', () => {
      const date = parseDate('25-12-2023');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2023);
    });

    it('should parse ISO format', () => {
      const date = parseDate('2023-12-25');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2023);
    });

    it('should parse Excel serial dates', () => {
      const date = parseDate(45016); // Excel date for ~2023
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBeGreaterThan(2000);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('invalid')).toBe(null);
      expect(parseDate('')).toBe(null);
      expect(parseDate(null)).toBe(null);
    });
  });

  describe('parseBool', () => {
    it('should parse true values', () => {
      expect(parseBool(true)).toBe(true);
      expect(parseBool('true')).toBe(true);
      expect(parseBool('sim')).toBe(true);
      expect(parseBool('s')).toBe(true);
      expect(parseBool('1')).toBe(true);
      expect(parseBool(1)).toBe(true);
      expect(parseBool('yes')).toBe(true);
      expect(parseBool('x')).toBe(true);
    });

    it('should parse false values', () => {
      expect(parseBool(false)).toBe(false);
      expect(parseBool('false')).toBe(false);
      expect(parseBool('nao')).toBe(false);
      expect(parseBool('0')).toBe(false);
      expect(parseBool(0)).toBe(false);
      expect(parseBool('')).toBe(false);
      expect(parseBool(null)).toBe(false);
      expect(parseBool(undefined)).toBe(false);
    });
  });

  describe('parseNumber', () => {
    it('should parse numbers', () => {
      expect(parseNumber(123)).toBe(123);
      expect(parseNumber('456')).toBe(456);
      expect(parseNumber('12.34')).toBe(12.34);
      expect(parseNumber('12,34')).toBe(12.34);
    });

    it('should return 0 for invalid values', () => {
      expect(parseNumber('abc')).toBe(0);
      expect(parseNumber('')).toBe(0);
      expect(parseNumber(null)).toBe(0);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should extract digits from phone', () => {
      expect(formatPhoneNumber('(11) 99999-8888')).toBe('11999998888');
      expect(formatPhoneNumber('11 9 9999 8888')).toBe('11999998888');
    });

    it('should return null for invalid phones', () => {
      expect(formatPhoneNumber('')).toBe(null);
      expect(formatPhoneNumber('123')).toBe(null);
    });
  });
});
