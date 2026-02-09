import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';

export interface SituationLevel {
  value: string;
  label: string;
  color: string; // hex color like '#10b981'
}

const DEFAULT_LEVELS: SituationLevel[] = [
  { value: 'A', label: 'Pronto para Batismo', color: '#10b981' },
  { value: 'B', label: 'Detalhes Pessoais', color: '#3b82f6' },
  { value: 'C', label: 'Estudando Bíblia', color: '#8b5cf6' },
  { value: 'D', label: 'Quer Estudar', color: '#f97316' },
  { value: 'E', label: 'Contato Inicial', color: '#6b7280' },
];

export function useSituationLevels() {
  const queryClient = useQueryClient();

  const {
    data: levels = DEFAULT_LEVELS,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['situation-levels'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/settings/my-district/situation-levels');
      if (!response.ok) throw new Error('Erro ao buscar níveis de situação');
      const json = await response.json();
      // Suporta formato padronizado { success, data: { levels } } e legado { levels }
      const responseData = json.data ?? json;
      return (responseData.levels as SituationLevel[]) || DEFAULT_LEVELS;
    },
    staleTime: 30 * 1000, // 30 segundos - mais curto para refletir mudanças mais rápido
    refetchOnMount: true, // Sempre buscar ao montar componente
  });

  const saveMutation = useMutation({
    mutationFn: async (newLevels: SituationLevel[]) => {
      const response = await fetchWithAuth('/api/settings/my-district/situation-levels', {
        method: 'POST',
        body: JSON.stringify({ levels: newLevels }),
      });
      if (!response.ok) throw new Error('Erro ao salvar níveis de situação');
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Atualizar cache imediatamente com os novos valores
      queryClient.setQueryData(['situation-levels'], variables);
      
      // Invalidar todas as queries que podem usar essas informações
      queryClient.invalidateQueries({ queryKey: ['situation-levels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      
      // Dispatch evento customizado para notificar outros componentes
      window.dispatchEvent(new CustomEvent('situation-levels-updated', { detail: variables }));
      
      // Forçar refetch para garantir que todos os componentes atualizem
      await refetch();
    },
  });

  const getLevelByValue = (value?: string) => {
    if (!value) return undefined;
    return levels.find((l) => l.value === value);
  };

  return {
    levels,
    isLoading,
    error,
    saveLevels: saveMutation.mutate,
    saveLevelsAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    getLevelByValue,
    DEFAULT_LEVELS,
  };
}
