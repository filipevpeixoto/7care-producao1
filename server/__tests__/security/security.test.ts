/**
 * Testes de Segurança
 * Valida proteções contra ataques comuns
 */

import { describe, it, expect } from '@jest/globals';

// Mock de funções de segurança
const securityUtils = {
  // Sanitização de input
  sanitizeInput: (input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Validação de email
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Detecção de SQL Injection
  detectSqlInjection: (input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|FETCH|DECLARE|CAST)\b)/i,
      /(--)|(\/\*)|(\*\/)/,
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,
      /(\bAND\b\s+\d+\s*=\s*\d+)/i,
      /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i,
      /(\bUNION\b\s+\bSELECT\b)/i,
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
  },

  // Detecção de XSS
  detectXss: (input: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /(javascript|vbscript|expression|applet|meta|xml|blink|link|style|script|embed|object|iframe|frame|frameset|ilayer|layer|bgsound|title|base):/i,
      /on\w+\s*=\s*["']?[^"']*["']?/i,
      /<[^>]*\s(on\w+)=/i,
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  },

  // Validação de senha forte
  isStrongPassword: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  },

  // Geração de token seguro
  generateSecureToken: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Validação de CSRF token
  validateCsrfToken: (token: string, secret: string): boolean => {
    // Simulação simples - em produção usar crypto
    return token.length >= 32 && token.startsWith(secret.substring(0, 4));
  },

  // Rate limiting check
  isRateLimited: (
    requests: number,
    limit: number,
    windowMs: number,
    currentTime: number,
    windowStart: number
  ): boolean => {
    if (currentTime - windowStart > windowMs) {
      return false; // Nova janela
    }
    return requests >= limit;
  },

  // Validação de JWT
  isValidJwtFormat: (token: string): boolean => {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      parts.forEach(part => {
        // Base64url decode check
        const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        atob(base64);
      });
      return true;
    } catch {
      return false;
    }
  },

  // Validação de headers de segurança
  hasSecurityHeaders: (headers: Record<string, string>): { valid: boolean; missing: string[] } => {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
    ];

    const missing = requiredHeaders.filter(header => !headers[header]);
    return { valid: missing.length === 0, missing };
  },
};

describe('Security Tests', () => {
  describe('Input Sanitization', () => {
    it('should sanitize HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = securityUtils.sanitizeInput(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should sanitize quotes', () => {
      const input = 'Hello "World" and \'Friends\'';
      const sanitized = securityUtils.sanitizeInput(input);
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain("'");
    });

    it('should sanitize slashes', () => {
      const input = 'path/to/file';
      const sanitized = securityUtils.sanitizeInput(input);
      expect(sanitized).not.toContain('/');
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      expect(securityUtils.isValidEmail('user@example.com')).toBe(true);
      expect(securityUtils.isValidEmail('user.name@domain.org')).toBe(true);
      expect(securityUtils.isValidEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(securityUtils.isValidEmail('notanemail')).toBe(false);
      expect(securityUtils.isValidEmail('@nodomain.com')).toBe(false);
      expect(securityUtils.isValidEmail('user@')).toBe(false);
      expect(securityUtils.isValidEmail('')).toBe(false);
    });
  });

  describe('SQL Injection Detection', () => {
    it('should detect SELECT statements', () => {
      expect(securityUtils.detectSqlInjection("'; SELECT * FROM users; --")).toBe(true);
      expect(securityUtils.detectSqlInjection('UNION SELECT password FROM users')).toBe(true);
    });

    it('should detect DROP statements', () => {
      expect(securityUtils.detectSqlInjection("'; DROP TABLE users; --")).toBe(true);
    });

    it('should detect OR 1=1 attacks', () => {
      expect(securityUtils.detectSqlInjection("' OR 1=1 --")).toBe(true);
      expect(securityUtils.detectSqlInjection("' OR 2=2 --")).toBe(true);
    });

    it('should detect comment injection', () => {
      expect(securityUtils.detectSqlInjection('input -- comment')).toBe(true);
      expect(securityUtils.detectSqlInjection('input /* comment */')).toBe(true);
    });

    it('should allow normal input', () => {
      expect(securityUtils.detectSqlInjection('John Doe')).toBe(false);
      expect(securityUtils.detectSqlInjection('user@example.com')).toBe(false);
      expect(securityUtils.detectSqlInjection('Regular text with numbers 123')).toBe(false);
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      expect(securityUtils.detectXss('<script>alert("xss")</script>')).toBe(true);
      expect(securityUtils.detectXss('<SCRIPT>alert("xss")</SCRIPT>')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(securityUtils.detectXss('javascript:alert("xss")')).toBe(true);
      expect(securityUtils.detectXss('<a href="javascript:void(0)">')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(securityUtils.detectXss('<img onerror="alert(1)">')).toBe(true);
      expect(securityUtils.detectXss('<div onmouseover="hack()">')).toBe(true);
    });

    it('should allow normal content', () => {
      expect(securityUtils.detectXss('Hello World')).toBe(false);
      expect(securityUtils.detectXss('This is a normal <text> message')).toBe(false);
    });
  });

  describe('Password Strength', () => {
    it('should accept strong passwords', () => {
      const result = securityUtils.isStrongPassword('SecureP@ss123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = securityUtils.isStrongPassword('Ab1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should require uppercase letters', () => {
      const result = securityUtils.isStrongPassword('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', () => {
      const result = securityUtils.isStrongPassword('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require numbers', () => {
      const result = securityUtils.isStrongPassword('NoNumbers!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', () => {
      const result = securityUtils.isStrongPassword('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('Token Generation', () => {
    it('should generate tokens of correct length', () => {
      const token = securityUtils.generateSecureToken(32);
      expect(token.length).toBe(32);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(securityUtils.generateSecureToken(32));
      }
      expect(tokens.size).toBe(100);
    });

    it('should only contain alphanumeric characters', () => {
      const token = securityUtils.generateSecureToken(100);
      expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should not rate limit under threshold', () => {
      const isLimited = securityUtils.isRateLimited(5, 10, 60000, Date.now(), Date.now() - 1000);
      expect(isLimited).toBe(false);
    });

    it('should rate limit at threshold', () => {
      const isLimited = securityUtils.isRateLimited(10, 10, 60000, Date.now(), Date.now() - 1000);
      expect(isLimited).toBe(true);
    });

    it('should reset after window expires', () => {
      const now = Date.now();
      const windowStart = now - 120000; // 2 minutes ago (window is 1 minute)
      const isLimited = securityUtils.isRateLimited(100, 10, 60000, now, windowStart);
      expect(isLimited).toBe(false);
    });
  });

  describe('JWT Format Validation', () => {
    it('should accept valid JWT format', () => {
      // Fake JWT with valid base64 parts
      const validJwt =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(securityUtils.isValidJwtFormat(validJwt)).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      expect(securityUtils.isValidJwtFormat('not.a.jwt')).toBe(false);
      expect(securityUtils.isValidJwtFormat('onlyonepart')).toBe(false);
      expect(securityUtils.isValidJwtFormat('two.parts')).toBe(false);
    });
  });

  describe('Security Headers Validation', () => {
    it('should pass with all required headers', () => {
      const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000',
      };
      const result = securityUtils.hasSecurityHeaders(headers);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail with missing headers', () => {
      const headers = {
        'X-Content-Type-Options': 'nosniff',
      };
      const result = securityUtils.hasSecurityHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('X-Frame-Options');
      expect(result.missing).toContain('Strict-Transport-Security');
    });
  });
});

// Export para uso em outros testes
export { securityUtils };
