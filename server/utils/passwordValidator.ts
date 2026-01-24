/**
 * Validador de senha forte
 * 
 * Implementa regras de complexidade para senhas:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 */

export interface PasswordStrength {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Lista de senhas comuns que devem ser rejeitadas
 */
const COMMON_PASSWORDS = [
  'password', '12345678', 'password123', 'admin123', 'qwerty123',
  '123456789', 'letmein', 'welcome', 'monkey', 'dragon',
  'master', 'sunshine', 'princess', 'football', 'iloveyou'
];

/**
 * Valida a força da senha
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  // Validação de comprimento
  if (!password || password.length < PASSWORD_RULES.minLength) {
    errors.push(`A senha deve ter no mínimo ${PASSWORD_RULES.minLength} caracteres`);
  } else {
    score += 20;
  }

  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(`A senha deve ter no máximo ${PASSWORD_RULES.maxLength} caracteres`);
  }

  // Validação de maiúscula
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }

  // Validação de minúscula
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }

  // Validação de número
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  } else if (/[0-9]/.test(password)) {
    score += 20;
  }

  // Validação de caractere especial
  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('A senha deve conter pelo menos um caractere especial (!@#$%^&* etc)');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
  }

  // Penalizar senhas comuns
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Esta senha é muito comum. Escolha uma senha mais forte.');
    score = Math.max(0, score - 40);
  }

  // Bonificação por comprimento adicional
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Determinar força da senha
  let strength: PasswordStrength['strength'];
  if (score >= 90) strength = 'very-strong';
  else if (score >= 70) strength = 'strong';
  else if (score >= 50) strength = 'medium';
  else strength = 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
}

/**
 * Valida senha e lança erro se inválida
 */
export function requireStrongPassword(password: string): void {
  const validation = validatePasswordStrength(password);
  
  if (!validation.isValid) {
    throw new Error(`Senha fraca: ${validation.errors.join(', ')}`);
  }

  if (validation.strength === 'weak') {
    throw new Error('A senha é muito fraca. Por favor, escolha uma senha mais forte.');
  }
}

/**
 * Gera sugestões para melhorar a senha
 */
export function getPasswordSuggestions(password: string): string[] {
  const suggestions: string[] = [];
  const validation = validatePasswordStrength(password);

  if (password.length < 12) {
    suggestions.push('Aumente o comprimento para pelo menos 12 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Adicione letras maiúsculas');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Adicione letras minúsculas');
  }

  if (!/[0-9]/.test(password)) {
    suggestions.push('Adicione números');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    suggestions.push('Adicione caracteres especiais (!@#$%^&* etc)');
  }

  if (validation.strength === 'weak' || validation.strength === 'medium') {
    suggestions.push('Considere usar uma frase-senha com palavras aleatórias');
  }

  return suggestions;
}
