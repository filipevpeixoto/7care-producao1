import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { User as UserType, Relationship, Church } from '@shared/schema';
import type { DiscipleshipRequestWithAdminNotes } from './usersTypes';
import type { AuthUser } from '@/../../shared/types/user';

const usersLogger = createLogger('Users');

export const useUsersQueries = (user: AuthUser | null, isAuthReady: boolean) => {
  const districtScope =
    user?.isImpersonating && user.role === 'pastor' && user.districtId ? user.districtId : null;

  const {
    data: usersData = [],
    isLoading,
    error,
  } = useQuery<UserType[]>({
    queryKey: ['/api/users', user?.id, user?.isImpersonating, user?.districtId],
    queryFn: async () => {
      try {
        const usersQueryParams = new URLSearchParams({ limit: '5000' });

        if (districtScope) {
          usersQueryParams.set('districtId', String(districtScope));
        }

        const response = await fetchWithAuth(`/api/users?${usersQueryParams.toString()}`);
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
    queryKey: ['all-relationships', user?.id, districtScope],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (districtScope) params.set('districtId', String(districtScope));
        const response = await fetchWithAuth(
          `/api/relationships${params.toString() ? `?${params.toString()}` : ''}`
        );
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

  const { data: churchesData = [] } = useQuery<Church[]>({
    queryKey: ['churches', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/churches');
      if (!response.ok) throw new Error('Erro ao buscar igrejas');
      const data = await response.json();
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: isAuthReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const churches = Array.isArray(churchesData) ? churchesData : [];

  const { data: discipleshipRequestsData = [] } = useQuery<DiscipleshipRequestWithAdminNotes[]>({
    queryKey: ['discipleship-requests', user?.id, districtScope],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(
        `/api/discipleship-requests${params.toString() ? `?${params.toString()}` : ''}`
      );
      if (!response.ok) throw new Error('Erro ao buscar solicitações de discipulado');
      const data = await response.json();
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: isAuthReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const discipleshipRequests = Array.isArray(discipleshipRequestsData)
    ? discipleshipRequestsData
    : [];

  return {
    users,
    isLoading,
    error,
    churches,
    safeRelationshipsData,
    discipleshipRequests,
  };
};
