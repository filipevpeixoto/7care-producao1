import { useMutation, useQueryClient } from '@tanstack/react-query';

interface MarkVisitParams {
  userId: number;
  visitDate: string;
}

export const useVisits = () => {
  const queryClient = useQueryClient();

  const markVisitMutation = useMutation({
    mutationFn: async ({ userId, visitDate }: MarkVisitParams) => {
      const response = await fetch(`/api/users/${userId}/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitDate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao marcar visita');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log('✅ Visita marcada com sucesso, invalidando queries...');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/visits'] });
      
      // Invalidate all dashboard-related queries to ensure visitometer updates
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Force immediate refetch of visitometer data
      queryClient.refetchQueries({ queryKey: ['/api/dashboard/visits'] });
      
      console.log('🔄 Queries invalidadas, visitômetro será atualizado');
    },
  });

  return {
    markVisit: markVisitMutation.mutate,
    isMarkingVisit: markVisitMutation.isPending,
    markVisitError: markVisitMutation.error,
  };
}; 