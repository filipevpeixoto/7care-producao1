import {
  hasAdminAccess,
  isImpersonatingUser,
  isPastor,
  isSuperAdmin,
  type AppRole,
  type UserLike,
} from '@/lib/permissions';

type RouteRule = {
  prefixes: string[];
  canAccess: (user: UserLike) => boolean;
};

const ROUTE_RULES: RouteRule[] = [
  {
    prefixes: ['/districts', '/pastors', '/pastor-invites'],
    canAccess: (user) => isSuperAdmin(user),
  },
  {
    prefixes: [
      '/push-notifications',
      '/reports',
      '/election-config',
      '/election-dashboard',
      '/election-manage',
    ],
    canAccess: (user) => hasAdminAccess(user),
  },
  {
    prefixes: ['/tasks'],
    canAccess: (user) => isPastor(user) && !isImpersonatingUser(user),
  },
];

const normalizePath = (pathname: string) => {
  const [path] = pathname.split('?');
  if (!path) return '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
};

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const canAccessPath = (user: UserLike, pathname: string): boolean => {
  const normalizedPath = normalizePath(pathname);
  const matchedRule = ROUTE_RULES.find((rule) =>
    rule.prefixes.some((prefix) => matchesPrefix(normalizedPath, prefix))
  );

  if (!matchedRule) return true;
  return matchedRule.canAccess(user);
};

export const getRoleHomePath = (role: AppRole | null) => {
  switch (role) {
    case 'interested':
      return '/dashboard';
    case 'member':
    case 'missionary':
    case 'pastor':
    case 'superadmin':
    default:
      return '/dashboard';
  }
};
