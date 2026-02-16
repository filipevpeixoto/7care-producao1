import { useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { QueryClient } from '@tanstack/react-query';

const usersLogger = createLogger('Users');

type UseUsersEffectsProps = {
  isRecalculating: boolean;
  setIsRecalculating: (value: boolean) => void;
  setRecalculationProgress: (value: number) => void;
  setRecalculationMessage: (value: string) => void;
  queryClient: QueryClient;
  toast: (args: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
};

export const useUsersEffects = ({
  isRecalculating,
  setIsRecalculating,
  setRecalculationProgress,
  setRecalculationMessage,
  queryClient,
  toast,
}: UseUsersEffectsProps) => {
  useEffect(() => {
    let endpointExists = true;

    const checkRecalculationProgress = async () => {
      if (!navigator.onLine || !endpointExists) return;

      try {
        const response = await fetchWithAuth('/api/system/recalculation-status');
        if (response.status === 404) {
          endpointExists = false;
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (data.isRecalculating) {
            setIsRecalculating(true);
            setRecalculationProgress(data.progress || 0);
            setRecalculationMessage(data.message || 'Recalculando pontos...');
          } else {
            setIsRecalculating(false);
            if (isRecalculating) {
              queryClient.invalidateQueries({ queryKey: ['/api/users'] });
              toast({
                title: '✅ Recálculo concluído!',
                description: 'Os pontos foram atualizados com sucesso.',
              });
            }
          }
        }
      } catch (error) {
        void error;
      }
    };

    const pollInterval = setInterval(checkRecalculationProgress, 5000);
    checkRecalculationProgress();

    return () => clearInterval(pollInterval);
  }, [
    isRecalculating,
    queryClient,
    setIsRecalculating,
    setRecalculationMessage,
    setRecalculationProgress,
    toast,
  ]);

  useEffect(() => {
    const handleSituationLevelsUpdate = () => {
      usersLogger.debug('Configurações de situação atualizadas em Users, forçando refresh...');
      queryClient.invalidateQueries({ queryKey: ['situation-levels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    };

    window.addEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    return () => window.removeEventListener('situation-levels-updated', handleSituationLevelsUpdate);
  }, [queryClient]);
};
