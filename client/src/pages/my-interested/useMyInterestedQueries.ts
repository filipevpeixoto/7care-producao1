import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import type { InterestedPerson, Relationship, DiscipleshipRequest } from './myInterestedTypes';
import type { UserMember, ActiveRelationship } from '@/types/domain';
import type { AuthUser } from '@/../../shared/types/user';

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
  const { data: churchInterested = [], isLoading: loadingChurch } = useQuery<InterestedPerson[]>({
    queryKey: ['church-interested', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/my-interested');
      if (!response.ok) throw new Error('Erro ao buscar interessados da igreja');
      return response.json();
    },
    enabled: !!user?.id && !isAdmin,
  });

  const { data: myRelationships = [], isLoading: loadingRelationships } = useQuery<Relationship[]>({
    queryKey: ['my-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/relationships?missionaryId=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: myRequests = [], isLoading: loadingRequests } = useQuery<DiscipleshipRequest[]>({
    queryKey: ['my-discipleship-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/discipleship-requests?missionaryId=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allRequests = [] } = useQuery<DiscipleshipRequest[]>({
    queryKey: ['all-discipleship-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/discipleship-requests');
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allRelationships = [] } = useQuery<ActiveRelationship[]>({
    queryKey: ['all-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/relationships');
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allUsers = [] } = useQuery<InterestedPerson[]>({
    queryKey: ['all-users', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return [];
      const endpoint = isAdmin ? '/api/users?role=interested' : '/api/users';
      const response = await fetchWithAuth(endpoint);
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: allMembersForInvite = [] } = useQuery<UserMember[]>({
    queryKey: ['all-members-for-invite', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/users');
      if (!response.ok) throw new Error('Erro ao buscar membros');
      return response.json();
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
