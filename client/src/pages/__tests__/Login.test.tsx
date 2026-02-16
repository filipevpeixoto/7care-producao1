import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../Login';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }),
}));

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({
    isInstallable: false,
    isInstalled: false,
    installApp: vi.fn().mockResolvedValue(false),
    getInstallInstructions: () => ({
      platform: 'Browser',
      steps: ['Passo 1', 'Passo 2'],
    }),
  }),
}));

vi.mock('@/hooks/useSystemLogo', () => ({
  useSystemLogo: () => ({
    systemLogo: null,
  }),
}));

describe('Login', () => {
  it('renderiza a tela de login', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // The button toggling between login/register should be present
    const toggleButton = screen.getByRole('button', { name: /cadastre|sign up|conta/i });
    expect(toggleButton).toBeInTheDocument();
  });
});
