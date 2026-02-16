import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { useActivities } from '../useActivities';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useActivities', () => {
  it('carrega atividades e filtra ativas', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useActivities(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities).toHaveLength(2);
    expect(result.current.activeActivities).toHaveLength(1);
    expect(result.current.activeActivities[0]?.id).toBe('1');
  });

  it('executa mutação de adicionar atividade', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useActivities(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addActivity({
        title: 'Nova Atividade',
        description: 'Descrição',
        imageUrl: 'https://example.com/nova.png',
        date: '2025-01-03',
        active: true,
        order: 3,
      });
    });

    await waitFor(() => expect(result.current.isAdding).toBe(false));
  });
});
