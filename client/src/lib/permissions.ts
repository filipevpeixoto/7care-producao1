/**
 * Funções helper para verificação de permissões no frontend
 */

// Tipo unificado que aceita tanto o User do auth quanto objetos parciais
export type UserLike =
  | {
      id?: string | number;
      role?: string;
      email?: string;
      districtId?: number | null;
      church?: string | null;
    }
  | null
  | undefined;

/**
 * Verifica se o usuário tem acesso de administrador (superadmin ou pastor)
 */
export const hasAdminAccess = (user: UserLike): boolean => {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'pastor';
};

/**
 * Verifica se o usuário é superadmin
 */
export const isSuperAdmin = (user: UserLike): boolean => {
  if (!user) return false;
  return user.role === 'superadmin';
};

/**
 * Verifica se o usuário é pastor
 */
export const isPastor = (user: UserLike): boolean => {
  if (!user) return false;
  return user.role === 'pastor';
};

/**
 * Verifica se o usuário pode gerenciar pastores (apenas superadmin)
 */
export const canManagePastors = (user: UserLike): boolean => {
  return isSuperAdmin(user);
};

/**
 * Verifica se o usuário pode acessar todas as igrejas (apenas superadmin)
 */
export const canAccessAllChurches = (user: UserLike): boolean => {
  return isSuperAdmin(user);
};

/**
 * Obtém o nome do perfil para exibição
 */
export const getRoleDisplayName = (role: string | undefined): string => {
  switch (role) {
    case 'superadmin':
      return 'Superadmin';
    case 'pastor':
      return 'Pastor';
    case 'missionary':
      return 'Missionário';
    case 'member':
      return 'Membro';
    case 'interested':
      return 'Interessado';
    default:
      return role || 'Usuário';
  }
};
