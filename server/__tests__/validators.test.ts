/**
 * Testes para validadores de API
 */

import { describe, it, expect } from '@jest/globals';

// Funções de validação usadas nas rotas
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/[^\d]/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  
  if (parseInt(cleaned.charAt(9)) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  
  return parseInt(cleaned.charAt(10)) === digit2;
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

function parseIntSafe(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value !== 0;
  return false;
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

describe('Validadores de API', () => {
  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidCPF', () => {
    it('should validate correct CPF', () => {
      expect(isValidCPF('529.982.247-25')).toBe(true);
      expect(isValidCPF('52998224725')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
      expect(isValidCPF('123')).toBe(false);
      expect(isValidCPF('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone', () => {
      expect(isValidPhone('11999999999')).toBe(true);
      expect(isValidPhone('1199999999')).toBe(true);
      expect(isValidPhone('(11) 99999-9999')).toBe(true);
    });

    it('should reject invalid phone', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('123456789012')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove HTML-like characters', () => {
      expect(sanitizeString('<script>alert()</script>')).toBe('scriptalert()/script');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('parseIntSafe', () => {
    it('should parse valid number', () => {
      expect(parseIntSafe(42)).toBe(42);
      expect(parseIntSafe('42')).toBe(42);
    });

    it('should return default for invalid', () => {
      expect(parseIntSafe('abc')).toBe(0);
      expect(parseIntSafe(null)).toBe(0);
      expect(parseIntSafe(undefined)).toBe(0);
    });

    it('should use custom default', () => {
      expect(parseIntSafe('abc', -1)).toBe(-1);
    });

    it('should floor decimal numbers', () => {
      expect(parseIntSafe(42.9)).toBe(42);
    });
  });

  describe('parseBoolean', () => {
    it('should parse boolean values', () => {
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
    });

    it('should parse string values', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
    });

    it('should parse number values', () => {
      expect(parseBoolean(1)).toBe(true);
      expect(parseBoolean(0)).toBe(false);
      expect(parseBoolean(-1)).toBe(true);
    });

    it('should return false for invalid', () => {
      expect(parseBoolean(null)).toBe(false);
      expect(parseBoolean(undefined)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should validate correct date', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should reject invalid date', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should format date string', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('2024-01-15');
    });
  });
});

describe('Validações de Entidades', () => {
  describe('User Validation', () => {
    const validateUser = (data: Record<string, unknown>) => {
      const errors: string[] = [];
      
      if (!data.name || String(data.name).length < 2) {
        errors.push('Nome deve ter pelo menos 2 caracteres');
      }
      
      if (!data.email || !isValidEmail(String(data.email))) {
        errors.push('Email inválido');
      }
      
      if (data.phone && !isValidPhone(String(data.phone))) {
        errors.push('Telefone inválido');
      }
      
      if (data.cpf && !isValidCPF(String(data.cpf))) {
        errors.push('CPF inválido');
      }
      
      return { valid: errors.length === 0, errors };
    };

    it('should validate complete user', () => {
      const result = validateUser({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '11999999999',
        cpf: '529.982.247-25'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid user', () => {
      const result = validateUser({
        name: 'J',
        email: 'invalid'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nome deve ter pelo menos 2 caracteres');
      expect(result.errors).toContain('Email inválido');
    });
  });

  describe('Church Validation', () => {
    const validateChurch = (data: Record<string, unknown>) => {
      const errors: string[] = [];
      
      if (!data.name || String(data.name).length < 3) {
        errors.push('Nome da igreja deve ter pelo menos 3 caracteres');
      }
      
      if (data.email && !isValidEmail(String(data.email))) {
        errors.push('Email da igreja inválido');
      }
      
      return { valid: errors.length === 0, errors };
    };

    it('should validate complete church', () => {
      const result = validateChurch({
        name: 'Igreja Central',
        email: 'church@example.com'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid church', () => {
      const result = validateChurch({
        name: 'Ig',
        email: 'invalid'
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('Event Validation', () => {
    const validateEvent = (data: Record<string, unknown>) => {
      const errors: string[] = [];
      
      if (!data.title || String(data.title).length < 3) {
        errors.push('Título deve ter pelo menos 3 caracteres');
      }
      
      if (!data.date || !isValidDate(String(data.date))) {
        errors.push('Data inválida');
      }
      
      return { valid: errors.length === 0, errors };
    };

    it('should validate complete event', () => {
      const result = validateEvent({
        title: 'Culto de Adoração',
        date: '2024-01-15'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid event', () => {
      const result = validateEvent({
        title: 'AB',
        date: 'invalid'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});

describe('Sanitização de Entrada', () => {
  describe('SQL Injection Prevention', () => {
    const sanitizeForSQL = (input: string): string => {
      return input.replace(/['";]/g, '');
    };

    it('should remove single quotes', () => {
      expect(sanitizeForSQL("O'Brien")).toBe('OBrien');
    });

    it('should remove double quotes', () => {
      expect(sanitizeForSQL('SELECT "name"')).toBe('SELECT name');
    });

    it('should remove semicolons', () => {
      expect(sanitizeForSQL('value; DROP TABLE')).toBe('value DROP TABLE');
    });
  });

  describe('XSS Prevention', () => {
    const sanitizeForXSS = (input: string): string => {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    it('should escape HTML tags', () => {
      expect(sanitizeForXSS('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape quotes', () => {
      expect(sanitizeForXSS('onclick="alert()"')).toBe('onclick=&quot;alert()&quot;');
    });
  });
});

describe('Transformações de Dados', () => {
  describe('Role normalization', () => {
    const normalizeRole = (role: string): string => {
      const roleMap: Record<string, string> = {
        'admin': 'admin',
        'administrator': 'admin',
        'super': 'super_admin',
        'super_admin': 'super_admin',
        'superadmin': 'super_admin',
        'pastor': 'pastor',
        'missionary': 'missionary',
        'member': 'member',
        'user': 'member',
        'interested': 'interested',
        'visitor': 'interested'
      };
      
      const normalized = role.toLowerCase().trim();
      return roleMap[normalized] || 'member';
    };

    it('should normalize admin roles', () => {
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('Administrator')).toBe('admin');
    });

    it('should normalize super admin roles', () => {
      expect(normalizeRole('super_admin')).toBe('super_admin');
      expect(normalizeRole('SUPERADMIN')).toBe('super_admin');
    });

    it('should default to member', () => {
      expect(normalizeRole('unknown')).toBe('member');
      expect(normalizeRole('')).toBe('member');
    });
  });

  describe('Status normalization', () => {
    const normalizeStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        'active': 'active',
        'ativo': 'active',
        'inactive': 'inactive',
        'inativo': 'inactive',
        'pending': 'pending',
        'pendente': 'pending',
        'blocked': 'blocked',
        'bloqueado': 'blocked'
      };
      
      const normalized = status.toLowerCase().trim();
      return statusMap[normalized] || 'pending';
    };

    it('should normalize active status', () => {
      expect(normalizeStatus('active')).toBe('active');
      expect(normalizeStatus('ATIVO')).toBe('active');
    });

    it('should normalize Portuguese status', () => {
      expect(normalizeStatus('pendente')).toBe('pending');
      expect(normalizeStatus('bloqueado')).toBe('blocked');
    });

    it('should default to pending', () => {
      expect(normalizeStatus('unknown')).toBe('pending');
    });
  });
});
