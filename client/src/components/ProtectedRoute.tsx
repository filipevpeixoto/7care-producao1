/**
 * ProtectedRoute
 * Wrapper para rotas que requerem autenticação.
 * Redireciona para "/" (Login) se o usuário não estiver autenticado.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // MobileLayout dentro das páginas já mostra loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
