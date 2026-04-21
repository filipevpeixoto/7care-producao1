/**
 * ProtectedRoute
 * Wrapper para rotas que requerem autenticação.
 * Redireciona para "/" (Login) se o usuário não estiver autenticado.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getUserRole } from '@/lib/permissions';
import { canAccessPath, getRoleHomePath } from '@/lib/routeAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null; // MobileLayout dentro das páginas já mostra loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to={getRoleHomePath(getUserRole(user))} replace />;
  }

  return <>{children}</>;
}
