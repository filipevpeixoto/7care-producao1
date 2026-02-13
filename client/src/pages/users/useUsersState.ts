/**
 * useUsersState — Custom hook for Users page
 *
 * Extracted from Users.tsx (2086 lines) to separate:
 * - State management (24 useState)
 * - Data fetching (5 useQuery, 6 useMutation)
 * - Business logic (filtering, sorting, mountain calculation)
 * - Handlers (21 functions)
 *
 * The Users component keeps only imports + hook call + JSX rendering.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';

const usersLogger = createLogger('Users');
import { useAuth } from '@/hooks/useAuth';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useToast } from '@/hooks/use-toast';
import { useSituationLevels } from '@/hooks/useSituationLevels';
import type { User as UserType, Relationship, DiscipleshipRequest, Church } from '@shared/schema';

// ── Types ───────────────────────────────────────────────────────

export type UserWithDiscipleRequest = UserType & { hasPendingDiscipleRequest: boolean };
export type DiscipleshipRequestWithAdminNotes = DiscipleshipRequest & {
  adminNotes?: string;
  processedBy?: number;
  processedAt?: string;
  requestedAt?: string;
  missionaryId?: number;
  interestedId?: number;
  notes?: string;
};

// ── Hook ────────────────────────────────────────────────────────

export function useUsersState() {
  const { user, isLoading: authLoading } = useAuth();
  useUserPoints();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { levels: situationLevels } = useSituationLevels();

  // Flag para verificar se auth está pronto
  const isAuthReady = !authLoading && !!user?.id;

  // ── State ───────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [churchFilter, setChurchFilter] = useState('all');
  const [mountainFilter, setMountainFilter] = useState('all');
  const [interestedSituationFilter, setInterestedSituationFilter] = useState('all');
  const [missionaryProfileFilter, setMissionaryProfileFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [showDiscipleDialog, setShowDiscipleDialog] = useState(false);
  const [userToDisciple, setUserToDisciple] = useState<UserType | null>(null);
  const [discipleMessage, setDiscipleMessage] = useState('');

  // Estados para autorização de discipulado
  const [showAuthorizationModal, setShowAuthorizationModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscipleshipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    church: '',
    role: 'member',
    password: '',
  });

  // Estados para progresso de recálculo
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculationProgress, setRecalculationProgress] = useState(0);
  const [recalculationMessage, setRecalculationMessage] = useState('');

  // ── Queries ─────────────────────────────────────────────────

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

  // ── Derived Values ──────────────────────────────────────────

  const usersWithDiscipleRequests: UserWithDiscipleRequest[] = users.map((u: UserType) => ({
    ...u,
    hasPendingDiscipleRequest: discipleshipRequests.some(
      (req: DiscipleshipRequestWithAdminNotes) =>
        req.interestedId === u.id && req.status === 'pending'
    ),
  }));

  // ── Business Logic: Priority ────────────────────────────────

  const getUserPriority = (u: UserWithDiscipleRequest) => {
    if (u.status === 'pending') return 1;
    if ((u.points || 0) < 300) return 2;
    if ((u.attendance || 0) < 50) return 3;
    if (!u.isApproved) return 4;
    return 5;
  };

  // ── Business Logic: Mountain Filtering ──────────────────────

  const handleMountainClick = (mountainKey: string) => {
    setMountainFilter(mountainKey);
    if (mountainKey !== 'all') {
      setSearchTerm('');
      setRoleFilter('all');
      setStatusFilter('all');
      setChurchFilter('all');
      setMissionaryProfileFilter('all');
      setInterestedSituationFilter('all');
    }
  };

  const handleInterestedSituationClick = (situationKey: string) => {
    setInterestedSituationFilter(situationKey);
    if (situationKey !== 'all') {
      setSearchTerm('');
      setRoleFilter('all');
      setStatusFilter('all');
      setChurchFilter('all');
      setMissionaryProfileFilter('all');
      setMountainFilter('all');
    }
  };

  const getMountainFilterName = () => {
    if (mountainFilter === 'all') return null;
    const mountainNames: { [key: string]: string } = {
      vale: 'Vale do Jordão',
      sinai: 'Monte Sinai',
      nebo: 'Monte Nebo',
      moria: 'Monte Moriá',
      carmelo: 'Monte Carmelo',
      hermon: 'Monte Hermon',
      siao: 'Monte Sião',
      oliveiras: 'Monte das Oliveiras',
      topo: 'O Topo',
    };
    return mountainNames[mountainFilter];
  };

  const getMountainCount = (mountain: string) => {
    if (mountain === 'all') return users.length;
    return users.filter((u) => {
      const points = u.points || 0;
      switch (mountain) {
        case 'vale': return points >= 0 && points <= 299;
        case 'sinai': return points >= 300 && points <= 399;
        case 'nebo': return points >= 400 && points <= 499;
        case 'moria': return points >= 500 && points <= 599;
        case 'carmelo': return points >= 600 && points <= 699;
        case 'hermon': return points >= 700 && points <= 799;
        case 'siao': return points >= 800 && points <= 899;
        case 'oliveiras': return points >= 900 && points <= 999;
        case 'topo': return points >= 1000;
        default: return false;
      }
    }).length;
  };

  const getInterestedSituationCount = (situation: string) => {
    if (situation === 'all') return users.filter((u) => u.role === 'interested').length;
    if (situation === 'total') return users.filter((u) => u.role === 'interested').length;
    if (situation === 'no-situation') {
      return users.filter(
        (u) => u.role === 'interested' && !(u.interestedSituation || (u as any).interested_situation)
      ).length;
    }
    return users.filter(
      (u) =>
        u.role === 'interested' &&
        (u.interestedSituation || (u as any).interested_situation) === situation
    ).length;
  };

  const getUsersCountByMountain = (mountainKey: string) => {
    const isUserMissionary = user?.role === 'missionary';
    const isUserDiscipulador =
      user?.role === 'member' &&
      safeRelationshipsData.some(
        (rel: Relationship) => rel.missionaryId === Number(user?.id) && rel.status === 'active'
      );

    const getPointsRange = (key: string) => {
      switch (key) {
        case 'vale': return [0, 300];
        case 'sinai': return [300, 400];
        case 'nebo': return [400, 500];
        case 'moria': return [500, 600];
        case 'carmelo': return [600, 700];
        case 'hermon': return [700, 800];
        case 'siao': return [800, 900];
        case 'oliveiras': return [900, 1000];
        case 'topo': return [1000, Infinity];
        default: return null;
      }
    };

    const range = getPointsRange(mountainKey);
    if (!range) return 0;

    if (isUserMissionary || isUserDiscipulador) {
      return usersWithDiscipleRequests.filter((u: UserWithDiscipleRequest) => {
        if (u.role !== 'interested') return false;
        const isLinkedToMissionary = safeRelationshipsData.some(
          (rel: Relationship) =>
            rel.missionaryId === Number(user?.id) &&
            rel.interestedId === u.id &&
            rel.status === 'active'
        );
        if (!isLinkedToMissionary) return false;
        const userPoints = u.points || 0;
        return userPoints >= range[0] && userPoints < range[1];
      }).length;
    } else {
      return usersWithDiscipleRequests.filter((u: UserWithDiscipleRequest) => {
        const userPoints = u.points || 0;
        return userPoints >= range[0] && userPoints < range[1];
      }).length;
    }
  };

  // ── Business Logic: Filter & Sort ───────────────────────────

  const filteredAndSortedUsers = usersWithDiscipleRequests
    .filter((u: UserWithDiscipleRequest) => {
      const matchesSearch =
        (u.name &&
          typeof u.name === 'string' &&
          u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email &&
          typeof u.email === 'string' &&
          u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesRole = !roleFilter || roleFilter === 'all' || u.role === roleFilter;
      if (roleFilter === 'missionary') {
        const isMissionaryRole = u.role === 'missionary';
        const hasMissionaryRelationship = safeRelationshipsData.some(
          (rel: Relationship) => rel.missionaryId === u.id && rel.status === 'active'
        );
        matchesRole = isMissionaryRole || hasMissionaryRelationship;
      }
      const matchesStatus = !statusFilter || statusFilter === 'all' || u.status === statusFilter;
      const matchesChurch = churchFilter === 'all' || u.church === churchFilter;

      let matchesMissionaryProfile = true;
      if (missionaryProfileFilter === 'missionary') {
        matchesMissionaryProfile = u.role.includes('missionary');
      } else if (missionaryProfileFilter === 'non-missionary') {
        matchesMissionaryProfile = !u.role.includes('missionary');
      }

      let matchesMountain = true;
      if (mountainFilter !== 'all') {
        const userPoints = u.points || 0;
        switch (mountainFilter) {
          case 'vale': matchesMountain = userPoints >= 0 && userPoints < 300; break;
          case 'sinai': matchesMountain = userPoints >= 300 && userPoints < 400; break;
          case 'nebo': matchesMountain = userPoints >= 400 && userPoints < 500; break;
          case 'moria': matchesMountain = userPoints >= 500 && userPoints < 600; break;
          case 'carmelo': matchesMountain = userPoints >= 600 && userPoints < 700; break;
          case 'hermon': matchesMountain = userPoints >= 700 && userPoints < 800; break;
          case 'siao': matchesMountain = userPoints >= 800 && userPoints < 900; break;
          case 'oliveiras': matchesMountain = userPoints >= 900 && userPoints < 1000; break;
          case 'topo': matchesMountain = userPoints >= 1000; break;
          default: matchesMountain = true;
        }
      }

      let matchesInterestedSituation = true;
      if (interestedSituationFilter !== 'all') {
        if (interestedSituationFilter === 'no-situation') {
          matchesInterestedSituation =
            u.role === 'interested' && !(u.interestedSituation || (u as any).interested_situation);
        } else if (interestedSituationFilter === 'total') {
          matchesInterestedSituation = u.role === 'interested';
        } else {
          matchesInterestedSituation =
            u.role === 'interested' &&
            (u.interestedSituation || (u as any).interested_situation) ===
              interestedSituationFilter;
        }
      }

      let matchesMissionaryRestriction = true;
      const isUserMissionary = user?.role === 'missionary';
      const isUserDiscipulador =
        user?.role === 'member' &&
        safeRelationshipsData.some(
          (rel: Relationship) => rel.missionaryId === Number(user?.id) && rel.status === 'active'
        );

      if (isUserMissionary || isUserDiscipulador) {
        if (u.role === 'interested') {
          matchesMissionaryRestriction = safeRelationshipsData.some(
            (rel: Relationship) =>
              rel.missionaryId === Number(user?.id) &&
              rel.interestedId === u.id &&
              rel.status === 'active'
          );
        } else if (user?.id !== null && user?.id !== undefined && u.id === Number(user.id)) {
          matchesMissionaryRestriction = true;
        } else {
          matchesMissionaryRestriction = false;
        }
      }

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesChurch &&
        matchesMountain &&
        matchesInterestedSituation &&
        matchesMissionaryProfile &&
        matchesMissionaryRestriction
      );
    })
    .sort((a: UserWithDiscipleRequest, b: UserWithDiscipleRequest) => {
      let aValue: string | number | Date, bValue: string | number | Date;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'points':
          aValue = a.points || 0;
          bValue = b.points || 0;
          break;
        case 'attendance':
          aValue = a.attendance || 0;
          bValue = b.attendance || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'priority':
          aValue = getUserPriority(a);
          bValue = getUserPriority(b);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // ── Mutations ───────────────────────────────────────────────

  const invalidateUserCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users/with-points'] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
    queryClient.invalidateQueries({ queryKey: ['church-interested'] });
  };

  const approveUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetchWithAuth(`/api/users/${userId}/approve`, { method: 'POST' }).then((res) => res.json()),
    onSuccess: () => {
      invalidateUserCaches();
      window.dispatchEvent(new CustomEvent('user-approved'));
      toast({ title: 'Usuário aprovado', description: 'O usuário foi aprovado com sucesso.' });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetchWithAuth(`/api/users/${userId}/reject`, { method: 'POST' }).then((res) => res.json()),
    onSuccess: () => {
      invalidateUserCaches();
      window.dispatchEvent(new CustomEvent('user-rejected'));
      toast({ title: 'Usuário rejeitado', description: 'O usuário foi rejeitado.', variant: 'destructive' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: Partial<UserType> }) =>
      fetchWithAuth(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    onSuccess: () => {
      invalidateUserCaches();
      window.dispatchEvent(new CustomEvent('user-updated'));
      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas com sucesso.',
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      role: string;
      phone?: string;
      church?: string;
      password?: string;
    }) => {
      const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Erro ao criar usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateUserCaches();
      toast({ title: '✅ Usuário criado', description: 'O usuário foi criado com sucesso.' });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      toast({
        title: '❌ Erro ao criar usuário',
        description: error instanceof Error ? error.message : 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetchWithAuth(`/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      invalidateUserCaches();
      toast({ title: '✅ Usuário excluído', description: 'Usuário excluído com sucesso!' });
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: '❌ Erro ao excluir usuário',
        description: error.message || 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    },
  });

  const discipleUserMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: number; message: string }) => {
      const response = await fetchWithAuth(`/api/users/${userId}/disciple`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disciple user');
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateUserCaches();
      toast({ title: '✅ Solicitação enviada', description: 'Solicitação de discipulado enviada com sucesso!' });
      setShowDiscipleDialog(false);
      setUserToDisciple(null);
      setDiscipleMessage('');
    },
    onError: (error: unknown) => {
      toast({
        title: '❌ Erro ao solicitar discipulado',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      });
    },
  });

  // ── Handlers ────────────────────────────────────────────────

  const handleApproveUser = (userId: number) => approveUserMutation.mutate(userId);
  const handleRejectUser = (userId: number) => rejectUserMutation.mutate(userId);

  const handleUpdateUser = (userId: number, data: Partial<UserType>) => {
    updateUserMutation.mutate({ userId, data });
    setSelectedUser((prev: UserType | null) => (prev ? { ...prev, ...data } : null));
  };

  const openCreateModal = () => {
    const defaultRole = 'member';
    setCreateFormData({
      name: '',
      email: '',
      phone: '',
      church: user?.church || '',
      role: defaultRole,
      password: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateFormChange = (field: string, value: string) => {
    setCreateFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: {
      name: string;
      email: string;
      role: string;
      phone?: string;
      church?: string;
      password?: string;
    } = {
      name: createFormData.name.trim(),
      email: createFormData.email.trim(),
      role: createFormData.role,
    };
    const phone = createFormData.phone.trim();
    const church = createFormData.church.trim();
    const password = createFormData.password.trim();
    if (phone) payload.phone = phone;
    if (church) payload.church = church;
    if (password) payload.password = password;
    createUserMutation.mutate(payload);
  };

  const handleDeleteUser = (u: UserType) => {
    setUserToDelete(u);
    setShowDeleteDialog(true);
  };

  const handleDiscipleRequest = (u: UserType) => {
    const request = discipleshipRequests.find(
      (req: DiscipleshipRequest) => req.interestedId === u.id && req.status === 'pending'
    );
    if (request) {
      setSelectedRequest(request);
      setAdminNotes(request.notes || '');
      setShowAuthorizationModal(true);
    }
  };

  const handleProcessDiscipleRequest = async (
    status: 'approved' | 'rejected',
    event?: FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();
    if (!selectedRequest) return;

    try {
      const response = await fetchWithAuth(`/api/discipleship-requests/${selectedRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: adminNotes.trim() }),
      });
      if (!response.ok) throw new Error('Erro ao processar solicitação');

      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });

      setShowAuthorizationModal(false);
      setSelectedRequest(null);
      setAdminNotes('');

      toast({
        title: '✅ Solicitação processada!',
        description: `A solicitação foi ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });
    } catch (error: unknown) {
      toast({
        title: '❌ Erro ao processar',
        description: error instanceof Error ? error.message : 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveActiveDisciple = async (interestedId: number) => {
    try {
      const allApprovedRequests = discipleshipRequests.filter(
        (req: DiscipleshipRequest) => req.interestedId === interestedId && req.status === 'approved'
      );

      for (const request of allApprovedRequests) {
        const rejectResponse = await fetchWithAuth(`/api/discipleship-requests/${request.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'rejected',
            notes: 'Discipulado desvinculado pelo administrador - solicitação rejeitada automaticamente',
          }),
        });
        if (!rejectResponse.ok) {
          usersLogger.error(`Erro ao rejeitar solicitação ${request.id}:`, await rejectResponse.text());
        }
      }

      const response = await fetchWithAuth(`/api/relationships/active/${interestedId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao remover discipulado');

      const cacheKeys = [
        'discipleship-requests', 'all-discipleship-requests', 'relationships',
        'all-relationships', 'users', 'my-interested', 'user-relationships',
      ];
      cacheKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

      const criticalKeys = [
        'discipleship-requests', 'all-discipleship-requests', 'relationships', 'all-relationships',
      ];
      criticalKeys.forEach((key) => queryClient.refetchQueries({ queryKey: [key] }));

      await new Promise((resolve) => setTimeout(resolve, 500));
      cacheKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

      toast({
        title: '✅ Discipulado removido!',
        description: `O relacionamento foi removido e ${allApprovedRequests.length} solicitações foram rejeitadas automaticamente.`,
      });
    } catch (error: unknown) {
      usersLogger.error('Erro ao remover discipulado:', error);
      toast({
        title: '❌ Erro ao remover',
        description: error instanceof Error ? error.message : 'Não foi possível remover o discipulado.',
        variant: 'destructive',
      });
    }
  };

  const confirmDeleteUser = () => {
    if (userToDelete) deleteUserMutation.mutate(userToDelete.id);
  };

  const handleEditUser = (u: UserType) => {
    setSelectedUser(u);
    setShowEditModal(true);
  };

  const handleViewUser = (u: UserType) => {
    setSelectedUser(u);
    setShowUserModal(true);
  };

  const handleScheduleVisit = (u: UserType) => {
    setSelectedUser(u);
    setShowScheduleModal(true);
  };

  // ── Effects ─────────────────────────────────────────────────

  // Monitorar progresso de recálculo de pontos
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
      } catch {
        // Silenciar erro - não é crítico
      }
    };

    const pollInterval = setInterval(checkRecalculationProgress, 5000);
    checkRecalculationProgress();

    return () => clearInterval(pollInterval);
  }, [isRecalculating, queryClient, toast]);

  // Escutar mudanças nas configurações de situação
  useEffect(() => {
    const handleSituationLevelsUpdate = () => {
      usersLogger.debug('Configurações de situação atualizadas em Users, forçando refresh...');
      queryClient.invalidateQueries({ queryKey: ['situation-levels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    };

    window.addEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    return () => window.removeEventListener('situation-levels-updated', handleSituationLevelsUpdate);
  }, [queryClient]);

  // ── Derived ─────────────────────────────────────────────────

  const pendingCount = users.filter((u: UserType) => u.status === 'pending').length;

  // ── Return ──────────────────────────────────────────────────

  return {
    // Auth
    user,
    isAuthReady,

    // Loading / Error
    isLoading,
    error,

    // Data
    users,
    churches,
    discipleshipRequests,
    safeRelationshipsData,
    usersWithDiscipleRequests,
    filteredAndSortedUsers,
    situationLevels,
    pendingCount,

    // Filter state
    searchTerm, setSearchTerm,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    churchFilter, setChurchFilter,
    mountainFilter, setMountainFilter,
    interestedSituationFilter, setInterestedSituationFilter,
    missionaryProfileFilter, setMissionaryProfileFilter,

    // UI state
    selectedUser, setSelectedUser,
    showUserModal, setShowUserModal,
    showEditModal, setShowEditModal,
    showCreateModal, setShowCreateModal,
    showScheduleModal, setShowScheduleModal,
    showDeleteDialog, setShowDeleteDialog,
    userToDelete, setUserToDelete,
    showDiscipleDialog, setShowDiscipleDialog,
    userToDisciple, setUserToDisciple,
    discipleMessage, setDiscipleMessage,
    showAuthorizationModal, setShowAuthorizationModal,
    selectedRequest, setSelectedRequest,
    adminNotes, setAdminNotes,
    createFormData, setCreateFormData,

    // Recalculation state
    isRecalculating,
    recalculationProgress,
    recalculationMessage,

    // Mountain helpers
    handleMountainClick,
    handleInterestedSituationClick,
    getMountainFilterName,
    getMountainCount,
    getInterestedSituationCount,
    getUsersCountByMountain,

    // Handlers
    handleApproveUser,
    handleRejectUser,
    handleUpdateUser,
    openCreateModal,
    handleCreateFormChange,
    handleCreateUserSubmit,
    handleDeleteUser,
    confirmDeleteUser,
    handleEditUser,
    handleViewUser,
    handleScheduleVisit,
    handleDiscipleRequest,
    handleProcessDiscipleRequest,
    handleRemoveActiveDisciple,

    // Mutations (for loading states)
    approveUserMutation,
    rejectUserMutation,
    updateUserMutation,
    createUserMutation,
    deleteUserMutation,
    discipleUserMutation,

    // Query client
    queryClient,
    toast,
  };
}
