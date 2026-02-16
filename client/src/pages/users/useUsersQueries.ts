import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { User as UserType, Relationship, Church } from '@shared/schema';
import type { DiscipleshipRequestWithAdminNotes } from './usersTypes';
import type { AuthUser } from '@/../../shared/types/user';

const usersLogger = createLogger('Users');

export const useUsersQueries = (user: AuthUser | null, isAuthReady: boolean) => {
  const {
    data: usersData = [],
    isLoading,
    error,
  } = useQuery<UserType[]>({
    queryKey: ['/api/users', user?.id],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth('/api/users?limit=5000');
        if (!response.ok) {
          throw new Error('Falha ao carregar usuários');
        }
        const data = await response.json();
        const users = Array.isArray(data) ? data : data?.data || [];
        return users as UserType[];
      } catch (_error) {
        usersLogger.error('Erro ao carregar usuários:', _error);
        return [];
      }
    },
    enabled: isAuthReady,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const users = Array.isArray(usersData) ? usersData : [];

  const { data: relationshipsData = [] } = useQuery<Relationship[]>({
    queryKey: ['all-relationships', user?.id],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth('/api/relationships');
        if (!response.ok) return [];
        const data = await response.json();
        const relationships = Array.isArray(data) ? data : data?.data || [];
        return relationships;
      } catch (_error) {
        usersLogger.error('Erro ao buscar relacionamentos:', _error);
        return [];
      }
    },
    enabled: isAuthReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const safeRelationshipsData = Array.isArray(relationshipsData) ? relationshipsData : [];

  useQuery({
    queryKey: ['/api/spiritual-checkins/scores', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/spiritual-checkins/scores');
      if (!response.ok) throw new Error('Failed to fetch spiritual check-ins');
      return response.json();
    },
    enabled: isAuthReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ['churches', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/churches');
      if (!response.ok) throw new Error('Erro ao buscar igrejas');
      return response.json();
    },
    enabled: isAuthReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: discipleshipRequests = [] } = useQuery<DiscipleshipRequestWithAdminNotes[]>({
    queryKey: ['discipleship-requests', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/discipleship-requests');
      if (!response.ok) throw new Error('Erro ao buscar solicitações de discipulado');
      return response.json();
    },
    enabled: isAuthReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return {
    users,
    isLoading,
    error,
    churches,
    safeRelationshipsData,
    discipleshipRequests,
  };
};
