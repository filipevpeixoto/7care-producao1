/**
 * Testes para hook useTasks
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mockFetchWithAuth = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}));

vi.mock('../useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useTasks } from '../useTasks';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTasks', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchWithAuth.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      user: { id: 2, role: 'pastor' },
    });
  });

  it('não reutiliza o cache legado compartilhado entre usuários', async () => {
    localStorage.setItem(
      '7care_tasks_cache',
      JSON.stringify([
        {
          id: 1,
          title: 'Tarefa antiga',
          status: 'pending',
          priority: 'medium',
          created_by: 1,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ])
    );

    mockFetchWithAuth.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('salva tarefas em uma chave específica do usuário', async () => {
    const task = {
      id: 10,
      title: 'Visitar interessado',
      status: 'pending',
      priority: 'high',
      created_by: 2,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [task] }),
    });

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([task]);
    expect(JSON.parse(localStorage.getItem('7care_tasks_cache_2') || '[]')).toEqual([task]);
    expect(localStorage.getItem('7care_tasks_cache')).toBeNull();
  });
});
