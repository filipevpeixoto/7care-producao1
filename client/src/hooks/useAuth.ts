/**
 * @fileoverview Hook de autenticação para gerenciamento de sessão de usuário
 * @module hooks/useAuth
 *
 * Este hook fornece funcionalidades completas de autenticação incluindo:
 * - Login e logout
 * - Persistência de sessão via localStorage
 * - Suporte a impersonação de usuários
 * - Integração com sistema offline
 * - Timeout de segurança para loading
 *
 * @example
 * ```tsx
 * const { user, login, logout, isAuthenticated, isLoading } = useAuth();
 *
 * // Fazer login
 * const success = await login('email@example.com', 'password');
 *
 * // Verificar autenticação
 * if (isAuthenticated) {
 *   console.log(`Olá, ${user.name}`);
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '@/types/auth';
import { saveUsersOffline, canAccessFullOfflineData, clearEncryptionKey } from '@/lib/offline';

/** User type com propriedades estendidas */
type ExtendedUser = User;

/** Logger condicional - só loga em desenvolvimento */
const isDev = import.meta.env.DEV;
const authLogger = {
  debug: (...args: unknown[]) => isDev && console.log('[Auth]', ...args),
  error: (...args: unknown[]) => console.error('[Auth Error]', ...args),
};

/** Chaves de armazenamento local */
const AUTH_STORAGE_KEY = '7care_auth';
const TOKEN_STORAGE_KEY = '7care_token';
const IMPERSONATION_KEY = '7care_impersonation';

/** Timeout máximo para carregamento de auth (10 segundos) */
const AUTH_TIMEOUT_MS = 10000;

/** Tempo máximo de impersonação (24 horas) */
const IMPERSONATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Hook principal de autenticação
 *
 * @returns {Object} Estado e funções de autenticação
 * @returns {User | null} returns.user - Usuário autenticado ou null
 * @returns {boolean} returns.isAuthenticated - Se há usuário autenticado
 * @returns {boolean} returns.isLoading - Se está carregando estado inicial
 * @returns {Function} returns.login - Função para fazer login
 * @returns {Function} returns.logout - Função para fazer logout
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    authLogger.debug('Checking stored auth...');

    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }, AUTH_TIMEOUT_MS);

    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

    // Verificar se há contexto de impersonação
    const impersonationContext = localStorage.getItem(IMPERSONATION_KEY);
    let impersonatingUser = null;

    if (impersonationContext) {
      try {
        const context = JSON.parse(impersonationContext);
        if (Date.now() - context.timestamp < IMPERSONATION_MAX_AGE_MS && context.isImpersonating) {
          impersonatingUser = context.impersonatingAs;
        } else {
          localStorage.removeItem(IMPERSONATION_KEY);
        }
      } catch {
        localStorage.removeItem(IMPERSONATION_KEY);
      }
    }

    if (storedAuth) {
      try {
        const user = JSON.parse(storedAuth);
        clearTimeout(timeoutId);

        const finalUser = impersonatingUser
          ? { ...user, ...impersonatingUser, isImpersonating: true }
          : user;

        setAuthState({
          user: finalUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        clearTimeout(timeoutId);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      clearTimeout(timeoutId);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }

    return () => clearTimeout(timeoutId);
  }, []);

  /**
   * Realiza login do usuário
   *
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<boolean>} True se login bem-sucedido
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // Armazenar JWT token
        if (data.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }

        const extendedUser: ExtendedUser = data.user;

        // Fetch church information
        try {
          const token = localStorage.getItem(TOKEN_STORAGE_KEY);
          const churchResponse = await fetch(`/api/user/church?userId=${extendedUser.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (churchResponse.ok) {
            const churchData = await churchResponse.json();

            if (churchData.success && churchData.church) {
              const userWithChurch: ExtendedUser = {
                ...extendedUser,
                church: churchData.church as string,
              };
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithChurch));
              setAuthState({
                user: userWithChurch,
                isAuthenticated: true,
                isLoading: false,
              });

              // Salvar dados do usuário offline se tiver permissão
              if (canAccessFullOfflineData(userWithChurch.role)) {
                saveUsersOffline([userWithChurch as any], userWithChurch.role).catch(err =>
                  authLogger.debug('Erro ao salvar offline:', err)
                );
              }

              return true;
            }
          }
        } catch {
          // Silently fall through to fallback
        }

        // Fallback - use login data without church
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(extendedUser));
        setAuthState({
          user: extendedUser,
          isAuthenticated: true,
          isLoading: false,
        });

        return true;
      }

      return false;
    } catch (error) {
      authLogger.error('Login failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(IMPERSONATION_KEY);
    // Limpar chave de criptografia ao fazer logout
    clearEncryptionKey().catch(() => {});
    authLogger.debug('Logout complete');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const stopImpersonating = useCallback(() => {
    localStorage.removeItem(IMPERSONATION_KEY);
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const user = JSON.parse(storedAuth);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        authLogger.error('Error restoring original user:', error);
      }
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!authState.user?.id) return false;

    try {
      authLogger.debug('Refreshing user data');

      const response = await fetch(`/api/users/${authState.user.id}`);
      if (response.ok) {
        const userData = await response.json();
        const updatedUser = { ...authState.user, ...userData };

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
        setAuthState(prev => ({
          ...prev,
          user: updatedUser,
        }));
        return true;
      }
      return false;
    } catch (error) {
      authLogger.error('Error refreshing user data:', error);
      return false;
    }
  }, [authState.user]);

  const register = useCallback(async (userData: Partial<User>): Promise<boolean> => {
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'interested',
      church: userData.church,
      isApproved: userData.role === 'interested',
      createdAt: new Date().toISOString(),
    };

    authLogger.debug('User registered:', newUser.email);
    return true;
  }, []);

  return {
    ...authState,
    login,
    logout,
    register,
    refreshUserData,
    stopImpersonating,
  };
};
