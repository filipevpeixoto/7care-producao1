import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useUserPoints } from '../useUserPoints';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1 },
  }),
}));

describe('useUserPoints', () => {
  it('carrega os pontos do usuário', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, unmount } = renderHook(() => useUserPoints(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.points).toBe(10);
    expect(result.current.data?.total).toBe(10);
    expect(result.current.error).toBeNull();

    unmount();
  });
});
