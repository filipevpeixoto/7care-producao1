/**
 * Testes para hook useAuth
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock do fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock do módulo offline
jest.mock('@/lib/offline', () => ({
  saveUsersOffline: jest.fn(),
  canAccessFullOfflineData: jest.fn(() => true),
  clearEncryptionKey: jest.fn(),
}));

// Import após os mocks
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
  });

  describe('Estado inicial', () => {
    it('deve iniciar com isLoading=true e user=null', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('deve carregar usuário do localStorage se existir', async () => {
      const storedUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'member',
        church: 'Test Church',
      };

      localStorageMock.setItem('7care_auth', JSON.stringify(storedUser));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(storedUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('deve limpar dados inválidos do localStorage', async () => {
      localStorageMock.setItem('7care_auth', 'invalid-json');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('7care_auth');
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'member',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
          token: 'test-token-123',
        }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean | undefined;
      await act(async () => {
        loginResult = await result.current.login('test@test.com', 'password123');
      });

      expect(loginResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7care_auth', JSON.stringify(mockUser));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7care_token', 'test-token-123');
    });

    it('deve falhar login com credenciais inválidas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Credenciais inválidas',
        }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean | undefined;
      await act(async () => {
        loginResult = await result.current.login('wrong@test.com', 'wrongpass');
      });

      expect(loginResult).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('deve tratar erro de rede no login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean | undefined;
      await act(async () => {
        loginResult = await result.current.login('test@test.com', 'password');
      });

      expect(loginResult).toBe(false);
    });
  });

  describe('logout', () => {
    it('deve fazer logout e limpar dados', async () => {
      const storedUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'member',
      };

      localStorageMock.setItem('7care_auth', JSON.stringify(storedUser));
      localStorageMock.setItem('7care_token', 'test-token');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('7care_auth');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('7care_token');
    });
  });

  // Nota: hasRole e canImpersonate foram removidos do hook useAuth
  // Essas funcionalidades agora são verificadas diretamente no user.role
});
