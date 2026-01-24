/**
 * Utilitários de Validação e Geração de Códigos
 * Funções compartilhadas para evitar duplicação de código
 */

/**
 * Gera código de igreja baseado no nome
 * Usa as iniciais das palavras do nome
 * @param name Nome da igreja
 * @returns Código gerado (máximo 10 caracteres)
 */
export function generateChurchCode(name: string): string {
  const base = name
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (base || 'CH').slice(0, 10);
}

/**
 * Gera código de distrito baseado no nome
 * Similar ao código de igreja
 * @param name Nome do distrito
 * @returns Código gerado (máximo 10 caracteres)
 */
export function generateDistrictCode(name: string): string {
  const base = name
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (base || 'DT').slice(0, 10);
}

/**
 * Valida formato de CPF (apenas formato, não valida dígitos verificadores)
 * @param cpf CPF a ser validado
 * @returns true se o formato é válido
 */
export function isValidCpfFormat(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11;
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 * @param cpf CPF a ser formatado
 * @returns CPF formatado
 */
export function formatCpf(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Valida formato de telefone brasileiro
 * @param phone Telefone a ser validado
 * @returns true se o formato é válido (10 ou 11 dígitos)
 */
export function isValidPhoneFormat(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Formata telefone para exibição
 * @param phone Telefone a ser formatado
 * @returns Telefone formatado
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Valida formato de email
 * @param email Email a ser validado
 * @returns true se o formato é válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normaliza string para comparação (remove acentos e converte para minúsculas)
 * @param str String a ser normalizada
 * @returns String normalizada
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sanitiza string para uso em URL ou código
 * Remove caracteres especiais e espaços
 * @param str String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeForCode(str: string): string {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Gera identificador único baseado em timestamp
 * @param prefix Prefixo do identificador
 * @returns Identificador único
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${randomPart}`.toUpperCase();
}

/**
 * Trunca string com reticências se necessário
 * @param str String a ser truncada
 * @param maxLength Comprimento máximo
 * @returns String truncada
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Capitaliza primeira letra de cada palavra
 * @param str String a ser capitalizada
 * @returns String capitalizada
 */
export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calcula idade a partir da data de nascimento
 * @param birthDate Data de nascimento
 * @returns Idade em anos
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Verifica se uma data é válida
 * @param date Data a ser verificada
 * @returns true se a data é válida
 */
export function isValidDate(date: unknown): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

export default {
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
  isValidDate
};
