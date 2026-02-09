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
    staleTime: 10 * 60 * 1000, // 10 min cache
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situation-levels'] });
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
