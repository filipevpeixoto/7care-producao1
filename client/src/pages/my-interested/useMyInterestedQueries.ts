import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import type { InterestedPerson, Relationship, DiscipleshipRequest } from './myInterestedTypes';
import type { UserMember, ActiveRelationship } from '@/types/domain';
import type { AuthUser } from '@/../../shared/types/user';

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | { data?: T[] };
    };

const extractList = <T>(payload: ApiListResponse<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && Array.isArray((payload.data as { data?: T[] }).data)) {
    return (payload.data as { data?: T[] }).data ?? [];
  }
  return [];
};

const getImpersonationDistrictId = (user: AuthUser | null): number | null => {
  if (!user?.isImpersonating || user.role !== 'pastor' || !user.districtId) return null;
  return user.districtId;
};

type MyInterestedQueriesResult = {
  churchInterested: InterestedPerson[];
  loadingChurch: boolean;
  myRelationships: Relationship[];
  loadingRelationships: boolean;
  myRequests: DiscipleshipRequest[];
  loadingRequests: boolean;
  allRequests: DiscipleshipRequest[];
  allRelationships: ActiveRelationship[];
  allUsers: InterestedPerson[];
  allMembersForInvite: UserMember[];
};

export const useMyInterestedQueries = (
  user: AuthUser | null,
  isAdmin: boolean,
  isPastorUser: boolean
): MyInterestedQueriesResult => {
  const districtScope = getImpersonationDistrictId(user);

  const { data: churchInterested = [], isLoading: loadingChurch } = useQuery<InterestedPerson[]>({
    queryKey: ['church-interested', user?.id, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams();
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(
        `/api/my-interested${params.toString() ? `?${params.toString()}` : ''}`
      );
      if (!response.ok) throw new Error('Erro ao buscar interessados da igreja');
      const payload = (await response.json()) as ApiListResponse<InterestedPerson>;
      return extractList(payload);
    },
    enabled: !!user?.id && !isAdmin,
  });

  const { data: myRelationships = [], isLoading: loadingRelationships } = useQuery<Relationship[]>({
    queryKey: ['my-relationships', user?.id, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams({ missionaryId: String(user.id) });
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(`/api/relationships?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      const payload = (await response.json()) as ApiListResponse<Relationship>;
      return extractList(payload);
    },
    enabled: !!user?.id,
  });

  const { data: myRequests = [], isLoading: loadingRequests } = useQuery<DiscipleshipRequest[]>({
    queryKey: ['my-discipleship-requests', user?.id, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams({ missionaryId: String(user.id) });
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(`/api/discipleship-requests?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      const payload = (await response.json()) as ApiListResponse<DiscipleshipRequest>;
      return extractList(payload);
    },
    enabled: !!user?.id,
  });

  const { data: allRequests = [] } = useQuery<DiscipleshipRequest[]>({
    queryKey: ['all-discipleship-requests', user?.id, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams();
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(
        `/api/discipleship-requests${params.toString() ? `?${params.toString()}` : ''}`
      );
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      const payload = (await response.json()) as ApiListResponse<DiscipleshipRequest>;
      return extractList(payload);
    },
    enabled: !!user?.id,
  });

  const { data: allRelationships = [] } = useQuery<ActiveRelationship[]>({
    queryKey: ['all-relationships', user?.id, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams();
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(
        `/api/relationships${params.toString() ? `?${params.toString()}` : ''}`
      );
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      const payload = (await response.json()) as ApiListResponse<ActiveRelationship>;
      return extractList(payload);
    },
    enabled: !!user?.id,
  });

  const { data: allUsers = [] } = useQuery<InterestedPerson[]>({
    queryKey: ['all-users', user?.id, isAdmin, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams({ role: 'interested', limit: '5000' });
      if (!isAdmin) params.delete('role');
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      const payload = (await response.json()) as ApiListResponse<InterestedPerson>;
      return extractList(payload);
    },
    enabled: !!user?.id,
  });

  const { data: allMembersForInvite = [] } = useQuery<UserMember[]>({
    queryKey: ['all-members-for-invite', user?.id, districtScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams({ limit: '5000' });
      if (districtScope) params.set('districtId', String(districtScope));
      const response = await fetchWithAuth(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao buscar membros');
      const payload = (await response.json()) as ApiListResponse<UserMember>;
      return extractList(payload);
    },
    enabled: !!user?.id && isPastorUser,
  });

  return {
    churchInterested,
    loadingChurch,
    myRelationships,
    loadingRelationships,
    myRequests,
    loadingRequests,
    allRequests,
    allRelationships,
    allUsers,
    allMembersForInvite,
  };
};
