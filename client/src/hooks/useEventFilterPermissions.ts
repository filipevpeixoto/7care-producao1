import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Permissions');

interface EventPermissions {
  [profileId: string]: {
    [eventTypeId: string]: boolean;
  };
}

export const useEventFilterPermissions = () => {
  // Usar as permissões de eventos existentes como base para os filtros
  const { data: permissions, isLoading, error } = useQuery<EventPermissions>({
    queryKey: ['system', 'event-permissions'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/system/event-permissions');
      if (!response.ok) {
        throw new Error('Erro ao carregar permissões');
      }
      const data = await response.json();
      return data; // A API retorna as permissões diretamente, não dentro de data.permissions
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const getAvailableEventTypes = useCallback((userRole: string): string[] => {
    logger.debug('🔍 getAvailableEventTypes:', { userRole, permissions });
    
    if (!permissions || !permissions[userRole]) {
      logger.debug('⚠️ No permissions found, using defaults');
      return ['igreja-local', 'asr-geral', 'asr-administrativo', 'asr-pastores', 'visitas', 'reunioes', 'pregacoes'];
    }

    const availableTypes = Object.keys(permissions[userRole]).filter(
      eventType => permissions[userRole][eventType]
    );
    
    logger.debug('✅ Available event types:', availableTypes);
    return availableTypes;
  }, [permissions]);

  const canFilterEventType = useCallback((userRole: string, eventType: string): boolean => {
    if (!permissions || !permissions[userRole]) {
      return true; // Fallback para permitir todos se não houver permissões
    }

    return permissions[userRole][eventType] || false;
  }, [permissions]);

  return {
    permissions,
    isLoading,
    error,
    getAvailableEventTypes,
    canFilterEventType,
  };
};
