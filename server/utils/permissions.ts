/**
 * Funções helper para verificação de permissões baseadas em roles
 */

import { User } from '../../shared/schema';

// Tipo para verificação de permissões - aceita User completo ou parcial
export type PermissionUser = Partial<User> | User;

/**
 * Verifica se o usuário tem acesso de administrador (superadmin ou pastor)
 */
export const hasAdminAccess = (user: PermissionUser | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'pastor';
};

/**
 * Verifica se o usuário é superadmin
 */
export const isSuperAdmin = (user: PermissionUser | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'superadmin';
};

/**
 * Verifica se o usuário é pastor (não inclui superadmin)
 */
export const isPastor = (user: PermissionUser | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'pastor';
};

/**
 * Verifica se o usuário é pastor OU superadmin (pastor e superadmin têm os mesmos privilégios base)
 */
export const isPastorOrSuperAdmin = (user: PermissionUser | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'pastor' || user.role === 'superadmin';
};

/**
 * Verifica se o usuário pode gerenciar pastores (apenas superadmin)
 */
export const canManagePastors = (user: PermissionUser | null | undefined): boolean => {
  return isSuperAdmin(user);
};

/**
 * Verifica se o usuário pode acessar todas as igrejas (apenas superadmin)
 */
export const canAccessAllChurches = (user: PermissionUser | null | undefined): boolean => {
  return isSuperAdmin(user);
};

/**
 * Verifica se o usuário pode acessar igrejas de um distrito específico
 * Superadmin sempre tem acesso, pastor apenas ao seu distrito
 */
export const canAccessDistrictChurches = (
  user: PermissionUser | null | undefined,
  churchDistrictId: number | null | undefined
): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true; // Superadmin sempre tem acesso
  if (isPastor(user) && user.districtId === churchDistrictId) return true;
  return false;
};

/**
 * Verifica se o usuário pode criar um usuário com determinado role
 * Superadmin pode criar qualquer role (incluindo pastor)
 * Pastor pode criar member, missionary, interested
 */
export const canCreateUserWithRole = (
  user: PermissionUser | null | undefined,
  targetRole: string
): boolean => {
  if (!user) return false;

  // Superadmin pode criar qualquer role (tem todos os privilégios de pastor + mais)
  if (isSuperAdmin(user)) return true;

  // Pastor pode criar member, missionary, interested
  if (isPastor(user)) {
    return ['member', 'missionary', 'interested'].includes(targetRole);
  }

  return false;
};

/**
 * Verifica se o usuário pode acessar dados de um distrito específico
 * Superadmin sempre tem acesso, pastor apenas ao seu distrito
 */
export const canAccessDistrict = (
  user: PermissionUser | null | undefined,
  districtId: number | null | undefined
): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true; // Superadmin sempre tem acesso
  if (isPastor(user) && user.districtId === districtId) return true;
  return false;
};

/**
 * Verifica se o usuário pode importar igrejas
 */
export const canImportChurches = (user: PermissionUser | null | undefined): boolean => {
  return hasAdminAccess(user);
};

/**
 * Verifica se o usuário pode importar igrejas para um distrito específico
 * Superadmin sempre pode importar para qualquer distrito, pastor apenas para o seu
 */
export const canImportChurchesToDistrict = (
  user: PermissionUser | null | undefined,
  districtId: number | null | undefined
): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true; // Superadmin sempre pode importar
  if (isPastor(user) && user.districtId === districtId) return true;
  return false;
};

