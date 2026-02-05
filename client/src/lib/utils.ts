import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se um email é um email fake/gerado automaticamente
 * Esses emails são gerados quando o usuário não tem email real cadastrado
 */
export function isFakeEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return true;
  
  const emailLower = email.trim().toLowerCase();
  
  // Padrões de emails fake gerados pelo sistema
  const fakeEmailPatterns = [
    '@naotem.email',
    '@importado.local',
    '@temp.com',
    'sem.email.',
    '@generated.',
    '@placeholder.',
  ];
  
  return fakeEmailPatterns.some(pattern => emailLower.includes(pattern));
}

/**
 * Formata o email para exibição
 * Retorna "Não informado" se o email for vazio ou fake
 */
export function formatEmailDisplay(email: string | null | undefined): string {
  if (!email || isFakeEmail(email)) {
    return 'Não informado';
  }
  return email;
}
