/**
 * Constantes de segurança centralizadas
 */

import { randomBytes } from 'crypto';

/** Salt rounds para bcrypt — NIST recomenda no mínimo 10, usamos 12 para melhor segurança */
export const BCRYPT_SALT_ROUNDS = 12;

/** Roles permitidos no auto-registro (sem admin/superadmin) */
export const ALLOWED_REGISTRATION_ROLES = ['interested', 'member', 'missionary'] as const;

/**
 * Gera uma senha temporária aleatória e segura.
 * Usada para reset de senha e criação de usuários sem senha definida.
 * O usuário DEVE trocar a senha no primeiro acesso (firstAccess: true).
 */
export function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64url');
}

/**
 * @deprecated Usar generateTemporaryPassword() em vez de senha fixa.
 * Mantido apenas para referência — retorna senha aleatória.
 */
export const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || generateTemporaryPassword();
