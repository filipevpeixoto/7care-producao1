/**
 * Constantes de segurança centralizadas
 */

/** Salt rounds para bcrypt — NIST recomenda no mínimo 10, usamos 12 para melhor segurança */
export const BCRYPT_SALT_ROUNDS = 12;

/** Roles permitidos no auto-registro (sem admin/superadmin) */
export const ALLOWED_REGISTRATION_ROLES = ['interested', 'member', 'missionary'] as const;

/** Senha padrão para reset — deve vir de variável de ambiente */
export const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || 'meu7care';
