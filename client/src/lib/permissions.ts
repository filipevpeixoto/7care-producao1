/**
 * Funções helper para verificação de permissões no frontend
 */

export type AppRole = 'superadmin' | 'pastor' | 'missionary' | 'member' | 'interested';

// Tipo unificado que aceita tanto o User do auth quanto objetos parciais
export type UserLike =
  | {
      id?: string | number;
      role?: string;
      email?: string;
      districtId?: number | null;
      church?: string | null;
      isImpersonating?: boolean;
    }
  | null
  | undefined;

export const getUserRole = (user: UserLike): AppRole | null => {
  if (!user?.role) return null;
  const role = String(user.role).toLowerCase();

  if (role.includes('superadmin')) return 'superadmin';
  if (role.includes('pastor')) return 'pastor';
  if (role.includes('missionary')) return 'missionary';
  if (role.includes('member')) return 'member';
  if (role.includes('interested')) return 'interested';

  return null;
};

/**
 * Verifica se o usuário tem acesso de administrador (superadmin ou pastor)
 */
export const hasAdminAccess = (user: UserLike): boolean => {
  const role = getUserRole(user);
  return role === 'superadmin' || role === 'pastor';
};

/**
 * Verifica se o usuário é superadmin
 */
export const isSuperAdmin = (user: UserLike): boolean => {
  return getUserRole(user) === 'superadmin';
};

/**
 * Verifica se o usuário é pastor
 */
export const isPastor = (user: UserLike): boolean => {
  return getUserRole(user) === 'pastor';
};

export const isMissionary = (user: UserLike): boolean => getUserRole(user) === 'missionary';

export const isMember = (user: UserLike): boolean => getUserRole(user) === 'member';

export const isInterested = (user: UserLike): boolean => getUserRole(user) === 'interested';

export const isImpersonatingUser = (user: UserLike): boolean =>
  Boolean(user && 'isImpersonating' in user && user.isImpersonating);

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
  switch (getUserRole(role ? { role } : null) || role) {
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
